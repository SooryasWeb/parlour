import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('test scripts run serially because integration tests reset one protected Postgres database', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  );

  assert.match(packageJson.scripts.test, /--test-concurrency=1/);
  assert.match(packageJson.scripts.coverage, /--test-concurrency=1/);
});
