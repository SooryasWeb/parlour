import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('dev database reset script refuses production-style connections', async () => {
  const script = await readFile(new URL('../scripts/reset-dev-db.js', import.meta.url), 'utf8');

  assert.match(script, /process\.env\.DATABASE_URL/);
  assert.match(script, /Refusing to reset a DATABASE_URL connection/);
  assert.match(script, /endsWith\('_dev'\)/);
  assert.match(script, /DROP DATABASE IF EXISTS/);
});

test('database initialization uses bounded retry for transient Postgres startup failures', async () => {
  const db = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');
  const nextDb = await readFile(new URL('../next-app/src/server/db.ts', import.meta.url), 'utf8');

  assert.match(db, /async function withDatabaseRetry/);
  assert.match(db, /SOORYAS_DB_RETRY_ATTEMPTS/);
  assert.match(db, /Connection terminated|connection timeout|ECONNRESET|ETIMEDOUT/);
  assert.match(nextDb, /async function withDatabaseRetry/);
  assert.match(nextDb, /SOORYAS_DB_RETRY_ATTEMPTS/);
});

test('database initialization applies non-destructive schema compatibility migrations', async () => {
  const db = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');
  const nextDb = await readFile(new URL('../next-app/src/server/db.ts', import.meta.url), 'utf8');

  for (const source of [db, nextDb]) {
    assert.match(source, /ensureSchemaCompatibility/);
    assert.match(source, /ALTER TABLE customers ADD COLUMN IF NOT EXISTS country_code/);
    assert.match(source, /ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_consent/);
    assert.match(source, /ALTER TABLE staff ADD COLUMN IF NOT EXISTS country_code/);
  }
});
