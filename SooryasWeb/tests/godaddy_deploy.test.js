import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('root package exposes GoDaddy-compatible metadata and scripts', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(packageJson.name, 'sooryas-web');
  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/);
  assert.equal(packageJson.main, 'src/server.js');
  assert.equal(packageJson.scripts.start, 'node src/server.js');
  assert.ok(packageJson.scripts.build);
  assert.match(packageJson.dependencies.mysql2, /^\^/);
});

test('root Node app binds to the hosting platform PORT environment variable', async () => {
  const server = await readFile(new URL('../src/server.js', import.meta.url), 'utf8');

  assert.match(server, /listen\(port = process\.env\.PORT \|\| 3000\)/);
});

test('GoDaddy MySQL adapter reads managed database env vars and keeps parameterized queries', async () => {
  const db = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');

  assert.match(db, /mysql2\/promise/);
  assert.match(db, /process\.env\.DB_HOST/);
  assert.match(db, /process\.env\.DB_PORT/);
  assert.match(db, /process\.env\.DB_NAME/);
  assert.match(db, /process\.env\.DB_USER/);
  assert.match(db, /process\.env\.DB_PASSWORD/);
  assert.match(db, /toMysqlSql/);
  assert.match(db, /mysql\.createConnection\(mysqlConfig\)/);
  assert.doesNotMatch(db, /mysql\.createPool/);
  assert.match(db, /await connection\.end\(\)/);
});

test('upload exclusions keep generated artifacts out of GoDaddy zip deploys', async () => {
  const gitignore = await readFile(new URL('../.gitignore', import.meta.url), 'utf8');

  for (const pattern of ['node_modules/', '.next/', 'test-results/', 'playwright-report/', '*.log']) {
    assert.match(gitignore, new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
