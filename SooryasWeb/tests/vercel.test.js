import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

async function fileExists(path) {
  try {
    await access(new URL(path, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

test('Vercel deployment targets the Next app instead of the legacy root prototype', async () => {
  const deployment = await readFile(new URL('../docs/deployment.md', import.meta.url), 'utf8');
  const nextPkg = JSON.parse(await readFile(new URL('../next-app/package.json', import.meta.url), 'utf8'));

  assert.equal(await fileExists('../vercel.json'), false);
  assert.equal(nextPkg.scripts.build, 'next build');
  assert.match(deployment, /set the Vercel project root directory to `next-app`/i);
  assert.doesNotMatch(deployment, /destination.*\/api\/index\.js/);
});

test('Supabase deployment docs require DATABASE_URL for pooled Postgres', async () => {
  const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  const deployment = await readFile(new URL('../docs/deployment.md', import.meta.url), 'utf8');

  assert.match(envExample, /DATABASE_URL=/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_URL=/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_ANON_KEY=/);
  assert.match(envExample, /SUPABASE_SERVICE_ROLE_KEY=/);
  assert.match(envExample, /pooler\.supabase\.com/);
  assert.match(deployment, /Supabase/i);
  assert.match(deployment, /DATABASE_URL/);
  assert.match(deployment, /transaction pooler/i);
});
