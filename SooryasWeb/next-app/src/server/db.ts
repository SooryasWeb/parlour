import pg from 'pg';

const { Pool } = pg;
type QueryResultRow = pg.QueryResultRow;

const databaseUrl = process.env.DATABASE_URL;
const shouldUseSsl =
  process.env.PGSSL === 'true' ||
  process.env.PGSSLMODE === 'require' ||
  Boolean(databaseUrl && databaseUrl.includes('pooler.supabase.com'));

const config = databaseUrl
  ? {
      connectionString: databaseUrl,
      max: Number.parseInt(process.env.PGPOOL_MAX || '1', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number.parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'soorya_admin',
      password: process.env.PGPASSWORD || 'soorya_password',
      database: process.env.PGDATABASE || 'sooryas_parlour_dev',
      max: Number.parseInt(process.env.PGPOOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
    };

declare global {
  // eslint-disable-next-line no-var
  var sooryasPool: pg.Pool | undefined;
}

export const pool = globalThis.sooryasPool ?? new Pool(config);

if (process.env.NODE_ENV !== 'production') {
  globalThis.sooryasPool = pool;
}

const compatibilityMigrations = [
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT '+91'",
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE staff ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT '+91'",
  "UPDATE customers SET country_code = '+91' WHERE country_code IS NULL",
  "UPDATE customers SET whatsapp_consent = FALSE WHERE whatsapp_consent IS NULL",
  "UPDATE staff SET country_code = '+91' WHERE country_code IS NULL",
];

let schemaCompatibilityPromise: Promise<void> | undefined;

const retryableDatabaseErrorPatterns = [
  'Connection terminated',
  'connection timeout',
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
];

function isRetryableDatabaseError(error: unknown) {
  const err = error as { code?: string; message?: string; cause?: { message?: string } };
  const message = `${err?.code || ''} ${err?.message || ''} ${err?.cause?.message || ''}`;
  return retryableDatabaseErrorPatterns.some((pattern) => message.includes(pattern));
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withDatabaseRetry<T>(operation: () => Promise<T>, label: string) {
  const attempts = Number.parseInt(process.env.SOORYAS_DB_RETRY_ATTEMPTS || '3', 10);
  const delayMs = Number.parseInt(process.env.SOORYAS_DB_RETRY_DELAY_MS || '250', 10);
  let lastError: unknown;

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

async function ensureSchemaCompatibility() {
  if (!schemaCompatibilityPromise) {
    schemaCompatibilityPromise = (async () => {
      for (const statement of compatibilityMigrations) {
        await withDatabaseRetry(() => pool.query(statement), 'schema compatibility migration');
      }
    })();
  }
  return schemaCompatibilityPromise;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
  await ensureSchemaCompatibility();
  return withDatabaseRetry(() => pool.query<T>(text, params), 'query');
}

export async function getClient() {
  await ensureSchemaCompatibility();
  return withDatabaseRetry(() => pool.connect(), 'client checkout');
}
