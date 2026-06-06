import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

const isTestRuntime =
  process.env.NODE_ENV === 'test' ||
  process.env.SOORYAS_TEST === '1' ||
  process.argv.some((arg) => arg === '--test' || arg.includes('\\node--test') || arg.includes('/node--test'));

const databaseUrl = process.env.DATABASE_URL;
const shouldUseSsl =
  process.env.PGSSL === 'true' ||
  process.env.PGSSLMODE === 'require' ||
  Boolean(databaseUrl && databaseUrl.includes('pooler.supabase.com'));

const connectionConfig = databaseUrl ? {
  connectionString: databaseUrl,
  max: parseInt(process.env.PGPOOL_MAX || (process.env.VERCEL ? '1' : '10'), 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
} : {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'soorya_admin',
  password: process.env.PGPASSWORD || 'soorya_password',
  database: process.env.PGDATABASE || (isTestRuntime ? 'sooryas_parlour_test' : 'sooryas_parlour_dev'),
  max: parseInt(process.env.PGPOOL_MAX || (process.env.VERCEL ? '1' : '10'), 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

if (shouldUseSsl) {
  connectionConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(connectionConfig);

let isInitialized = false;

const compatibilityMigrations = [
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT '+91'",
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE staff ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT '+91'",
  "UPDATE customers SET country_code = '+91' WHERE country_code IS NULL",
  "UPDATE customers SET whatsapp_consent = FALSE WHERE whatsapp_consent IS NULL",
  "UPDATE staff SET country_code = '+91' WHERE country_code IS NULL",
];

const retryableDatabaseErrorPatterns = [
  'Connection terminated',
  'connection timeout',
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
];

function isRetryableDatabaseError(error) {
  const message = `${error?.code || ''} ${error?.message || ''} ${error?.cause?.message || ''}`;
  return retryableDatabaseErrorPatterns.some((pattern) => message.includes(pattern));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withDatabaseRetry(operation, label) {
  const attempts = parseInt(process.env.SOORYAS_DB_RETRY_ATTEMPTS || '3', 10);
  const delayMs = parseInt(process.env.SOORYAS_DB_RETRY_DELAY_MS || '250', 10);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryableDatabaseError(error)) {
        throw error;
      }
      console.warn(`Transient database error during ${label}; retrying (${attempt + 1}/${attempts}).`);
      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}

function isResetSafeDatabase(databaseName) {
  return typeof databaseName === 'string' && databaseName.endsWith('_test');
}

async function ensureTestDatabaseExists() {
  if (!isResetSafeDatabase(connectionConfig.database)) return;
  if (!/^[a-zA-Z0-9_]+$/.test(connectionConfig.database)) {
    throw new Error(`Unsafe test database name "${connectionConfig.database}".`);
  }

  const adminPool = new Pool({
    ...connectionConfig,
    database: process.env.PGMAINTENANCE_DATABASE || 'postgres',
    max: 1,
  });

  try {
    const exists = await withDatabaseRetry(
      () => adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [connectionConfig.database]),
      'test database lookup'
    );
    if (exists.rowCount === 0) {
      await withDatabaseRetry(
        () => adminPool.query(`CREATE DATABASE ${connectionConfig.database}`),
        'test database creation'
      );
    }
  } finally {
    await adminPool.end();
  }
}

async function ensureSchemaCompatibility() {
  for (const statement of compatibilityMigrations) {
    await withDatabaseRetry(() => pool.query(statement), 'schema compatibility migration');
  }
}

export function getDatabaseName() {
  return connectionConfig.database || 'DATABASE_URL';
}

export async function query(text, params) {
  if (!isInitialized) {
    await initDb();
  }
  return withDatabaseRetry(() => pool.query(text, params), 'query');
}

export async function getClient() {
  if (!isInitialized) {
    await initDb();
  }
  return withDatabaseRetry(() => pool.connect(), 'client checkout');
}

export async function initDb(forceReset = false) {
  try {
    const databaseName = connectionConfig.database || databaseUrl;

    if (forceReset && !isResetSafeDatabase(databaseName)) {
      throw new Error(
        `Refusing destructive schema reset on database "${databaseName}". Reset is allowed only on databases ending with "_test".`
      );
    }

    await ensureTestDatabaseExists();

    // Check if the schema is already initialized
    if (!forceReset) {
      const checkRes = await withDatabaseRetry(() => pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'tenants'
        );
      `), 'schema initialization check');
      if (checkRes.rows[0].exists) {
        await ensureSchemaCompatibility();
        isInitialized = true;
        console.log('Database already initialized.');
        return;
      }
    }

    if (!forceReset && !isTestRuntime && process.env.ALLOW_SCHEMA_INIT !== 'true') {
      throw new Error(
        'Database schema is missing. Refusing automatic schema initialization outside tests unless ALLOW_SCHEMA_INIT=true.'
      );
    }

    console.log('Initializing database schema...');
    const schemaPath = fileURLToPath(new URL('../data/schema.sql', import.meta.url));
    const schemaSql = await readFile(schemaPath, 'utf8');
    
    // Execute DDL and seed data
    await withDatabaseRetry(() => pool.query(schemaSql), 'schema initialization');
    await ensureSchemaCompatibility();
    isInitialized = true;
    console.log('Database schema initialized and seeded successfully.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export async function closePool() {
  await pool.end();
}
