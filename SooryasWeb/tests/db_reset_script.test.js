import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('dev database reset script refuses non-development database names', async () => {
  const script = await readFile(new URL('../scripts/reset-dev-db.js', import.meta.url), 'utf8');

  assert.match(script, /endsWith\('_dev'\)/);
  assert.match(script, /DROP DATABASE IF EXISTS/);
});

test('database initialization uses bounded retry for transient Postgres startup failures', async () => {
  const db = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');

  assert.match(db, /async function withDatabaseRetry/);
  assert.match(db, /SOORYAS_DB_RETRY_ATTEMPTS/);
  assert.match(db, /Connection terminated|connection timeout|ECONNRESET|ETIMEDOUT/);
});

test('database initialization applies non-destructive schema compatibility migrations', async () => {
  const db = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');

  assert.match(db, /ensureSchemaCompatibility/);
  assert.match(db, /ALTER TABLE customers ADD COLUMN IF NOT EXISTS country_code/);
  assert.match(db, /ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_consent/);
  assert.match(db, /ALTER TABLE staff ADD COLUMN IF NOT EXISTS country_code/);
});
