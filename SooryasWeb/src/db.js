import pg from 'pg';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { Pool: PgPool } = pg;

const isTestRuntime =
  process.env.NODE_ENV === 'test' ||
  process.env.SOORYAS_TEST === '1' ||
  process.argv.some((arg) => arg === '--test' || arg.includes('\\node--test') || arg.includes('/node--test'));

const shouldUseMysql = Boolean(process.env.DB_HOST);
const dialect = shouldUseMysql ? 'mysql' : 'postgres';

const postgresConfig = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'soorya_admin',
  password: process.env.PGPASSWORD || 'soorya_password',
  database: process.env.PGDATABASE || (isTestRuntime ? 'sooryas_parlour_test' : 'sooryas_parlour_dev'),
  max: parseInt(process.env.PGPOOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const mysqlConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
};

const postgresPool = shouldUseMysql ? null : new PgPool(postgresConfig);

let isInitialized = false;

const postgresCompatibilityMigrations = [
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT '+91'",
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE staff ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT '+91'",
  "UPDATE customers SET country_code = '+91' WHERE country_code IS NULL",
  "UPDATE customers SET whatsapp_consent = FALSE WHERE whatsapp_consent IS NULL",
  "UPDATE staff SET country_code = '+91' WHERE country_code IS NULL",
];

const mysqlCompatibilityMigrations = [
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS country_code VARCHAR(8) NOT NULL DEFAULT '+91'",
  'ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN NOT NULL DEFAULT FALSE',
  "ALTER TABLE staff ADD COLUMN IF NOT EXISTS country_code VARCHAR(8) NOT NULL DEFAULT '+91'",
  "UPDATE customers SET country_code = '+91' WHERE country_code IS NULL",
  'UPDATE customers SET whatsapp_consent = FALSE WHERE whatsapp_consent IS NULL',
  "UPDATE staff SET country_code = '+91' WHERE country_code IS NULL",
];

const retryableDatabaseErrorPatterns = [
  'Connection terminated',
  'connection timeout',
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'PROTOCOL_CONNECTION_LOST',
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

function placeholderParams(sql, params = []) {
  const ordered = [];
  const text = sql.replace(/\$(\d+)/g, (_, index) => {
    ordered.push(params[Number(index) - 1]);
    return '?';
  });
  return { text, params: ordered };
}

export function toMysqlSql(sql, params = []) {
  let text = sql
    .replace(/COUNT\(\*\)::integer/gi, 'COUNT(*)')
    .replace(/COALESCE\(SUM\(([^)]+)\), 0\)::numeric/gi, 'COALESCE(SUM($1), 0)')
    .replace(/\s+RETURNING\s+\*/gi, '');

  return placeholderParams(text, params);
}

function normalizeMysqlRows(rows) {
  return Array.isArray(rows) ? rows : [];
}

async function mysqlQuery(sql, params = []) {
  const connection = await mysql.createConnection(mysqlConfig);
  try {
    if (/INSERT\s+INTO\s+invoice_sequences/i.test(sql) && /ON\s+CONFLICT/i.test(sql)) {
      const tenantId = params[0];
      const invoiceYear = params[1];
      const [result] = await connection.query(
        `INSERT INTO invoice_sequences (tenant_id, invoice_year, last_number)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1), updated_at = CURRENT_TIMESTAMP`,
        [tenantId, invoiceYear]
      );
      if (result.affectedRows === 1) {
        return { rows: [{ last_number: 1 }], rowCount: 1 };
      }
      const [rows] = await connection.query('SELECT LAST_INSERT_ID() AS last_number');
      return { rows: normalizeMysqlRows(rows), rowCount: normalizeMysqlRows(rows).length };
    }

    const returningAll = /\s+RETURNING\s+\*/i.test(sql);
    const tableMatch = sql.match(/^\s*(?:INSERT\s+INTO|UPDATE)\s+([a-z_]+)/i);
    const id = params[0];
    const { text, params: mysqlParams } = toMysqlSql(sql, params);
    const [result] = await connection.query(text, mysqlParams);

    if (returningAll && tableMatch && id) {
      const [rows] = await connection.query(`SELECT * FROM ${tableMatch[1]} WHERE id = ?`, [id]);
      return { rows: normalizeMysqlRows(rows), rowCount: normalizeMysqlRows(rows).length };
    }

    const rows = normalizeMysqlRows(result);
    return {
      rows,
      rowCount: Array.isArray(result) ? result.length : result.affectedRows || 0,
    };
  } finally {
    await connection.end();
  }
}

async function postgresQuery(sql, params) {
  return postgresPool.query(sql, params);
}

async function runQuery(sql, params) {
  return dialect === 'mysql' ? mysqlQuery(sql, params) : postgresQuery(sql, params);
}

async function ensureTestDatabaseExists() {
  if (dialect !== 'postgres') return;
  if (!isResetSafeDatabase(postgresConfig.database)) return;
  if (!/^[a-zA-Z0-9_]+$/.test(postgresConfig.database)) {
    throw new Error(`Unsafe test database name "${postgresConfig.database}".`);
  }

  const adminPool = new PgPool({
    ...postgresConfig,
    database: process.env.PGMAINTENANCE_DATABASE || 'postgres',
    max: 1,
  });

  try {
    const exists = await withDatabaseRetry(
      () => adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [postgresConfig.database]),
      'test database lookup'
    );
    if (exists.rowCount === 0) {
      await withDatabaseRetry(
        () => adminPool.query(`CREATE DATABASE ${postgresConfig.database}`),
        'test database creation'
      );
    }
  } finally {
    await adminPool.end();
  }
}

async function ensureSchemaCompatibility() {
  const migrations = dialect === 'mysql' ? mysqlCompatibilityMigrations : postgresCompatibilityMigrations;
  for (const statement of migrations) {
    await withDatabaseRetry(() => runQuery(statement), 'schema compatibility migration');
  }
}

async function schemaExists() {
  if (dialect === 'mysql') {
    const result = await withDatabaseRetry(
      () => mysqlQuery(
        `SELECT COUNT(*) AS count
         FROM information_schema.tables
         WHERE table_schema = ? AND table_name = 'tenants'`,
        [mysqlConfig.database]
      ),
      'schema initialization check'
    );
    return Number(result.rows[0]?.count || 0) > 0;
  }

  const checkRes = await withDatabaseRetry(() => postgresQuery(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'tenants'
    );
  `), 'schema initialization check');
  return Boolean(checkRes.rows[0].exists);
}

export function getDatabaseName() {
  if (dialect === 'mysql') return mysqlConfig.database;
  return postgresConfig.database;
}

export async function query(text, params) {
  if (!isInitialized) {
    await initDb();
  }
  return withDatabaseRetry(() => runQuery(text, params), 'query');
}

export async function getClient() {
  if (!isInitialized) {
    await initDb();
  }

  if (dialect === 'postgres') {
    return withDatabaseRetry(() => postgresPool.connect(), 'client checkout');
  }

  const connection = await withDatabaseRetry(() => mysql.createConnection(mysqlConfig), 'client checkout');
  return {
    query(text, params) {
      return withDatabaseRetry(async () => {
        if (text === 'BEGIN') {
          await connection.beginTransaction();
          return { rows: [], rowCount: 0 };
        }
        if (text === 'COMMIT') {
          await connection.commit();
          return { rows: [], rowCount: 0 };
        }
        if (text === 'ROLLBACK') {
          await connection.rollback();
          return { rows: [], rowCount: 0 };
        }
        const runOnConnection = async (sql, values = []) => {
          const { text: mysqlText, params: mysqlParams } = toMysqlSql(sql, values);
          const [rows] = await connection.query(mysqlText, mysqlParams);
          return { rows: normalizeMysqlRows(rows), rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows || 0 };
        };

        if (/INSERT\s+INTO\s+invoice_sequences/i.test(text) && /ON\s+CONFLICT/i.test(text)) {
          const tenantId = params[0];
          const invoiceYear = params[1];
          const [result] = await connection.query(
            `INSERT INTO invoice_sequences (tenant_id, invoice_year, last_number)
             VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1), updated_at = CURRENT_TIMESTAMP`,
            [tenantId, invoiceYear]
          );
          if (result.affectedRows === 1) return { rows: [{ last_number: 1 }], rowCount: 1 };
          const [rows] = await connection.query('SELECT LAST_INSERT_ID() AS last_number');
          return { rows: normalizeMysqlRows(rows), rowCount: normalizeMysqlRows(rows).length };
        }

        const returningAll = /\s+RETURNING\s+\*/i.test(text);
        const tableMatch = text.match(/^\s*(?:INSERT\s+INTO|UPDATE)\s+([a-z_]+)/i);
        const id = params?.[0];
        const result = await runOnConnection(text, params);
        if (returningAll && tableMatch && id) {
          const [rows] = await connection.query(`SELECT * FROM ${tableMatch[1]} WHERE id = ?`, [id]);
          return { rows: normalizeMysqlRows(rows), rowCount: normalizeMysqlRows(rows).length };
        }
        return result;
      }, 'transaction query');
    },
    release() {
      void connection.end();
    },
  };
}

export async function initDb(forceReset = false) {
  try {
    const databaseName = getDatabaseName();

    if (forceReset && dialect !== 'postgres') {
      throw new Error('Destructive test schema reset is supported only for the local PostgreSQL test harness.');
    }

    if (forceReset && !isResetSafeDatabase(databaseName)) {
      throw new Error(
        `Refusing destructive schema reset on database "${databaseName}". Reset is allowed only on databases ending with "_test".`
      );
    }

    await ensureTestDatabaseExists();

    if (!forceReset && await schemaExists()) {
      await ensureSchemaCompatibility();
      isInitialized = true;
      console.log('Database already initialized.');
      return;
    }

    if (!forceReset && !isTestRuntime && process.env.ALLOW_SCHEMA_INIT !== 'true') {
      throw new Error(
        'Database schema is missing. Refusing automatic schema initialization outside tests unless ALLOW_SCHEMA_INIT=true.'
      );
    }

    console.log('Initializing database schema...');
    const schemaFile = dialect === 'mysql' ? '../data/schema.mysql.sql' : '../data/schema.sql';
    const schemaPath = fileURLToPath(new URL(schemaFile, import.meta.url));
    const schemaSql = await readFile(schemaPath, 'utf8');

    await withDatabaseRetry(() => runQuery(schemaSql), 'schema initialization');
    await ensureSchemaCompatibility();
    isInitialized = true;
    console.log('Database schema initialized and seeded successfully.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export async function closePool() {
  if (postgresPool) {
    await postgresPool.end();
  }
}
