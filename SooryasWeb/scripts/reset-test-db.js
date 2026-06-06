process.env.NODE_ENV = 'test';
process.env.SOORYAS_TEST = '1';
process.env.PGDATABASE = process.env.PGDATABASE || 'sooryas_parlour_test';

const db = await import('../src/db.js');

try {
  await db.initDb(true);
} finally {
  await db.closePool();
}
