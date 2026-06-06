import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

const targetDatabase = process.env.PGDATABASE || 'sooryas_parlour_dev';
if (!/^[a-zA-Z0-9_]+$/.test(targetDatabase) || !targetDatabase.endsWith('_dev')) {
  throw new Error(`Refusing to reset database "${targetDatabase}". Local dev resets require a database name ending with "_dev".`);
}

const baseConfig = {
  host: process.env.PGHOST || 'localhost',
  port: Number.parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'soorya_admin',
  password: process.env.PGPASSWORD || 'soorya_password',
  max: 1,
  connectionTimeoutMillis: 3000,
};

const maintenancePool = new Pool({
  ...baseConfig,
  database: process.env.PGMAINTENANCE_DATABASE || 'postgres',
});

try {
  console.log(`Resetting local development database "${targetDatabase}"...`);
  await maintenancePool.query(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
    [targetDatabase]
  );
  await maintenancePool.query(`DROP DATABASE IF EXISTS ${targetDatabase}`);
  await maintenancePool.query(`CREATE DATABASE ${targetDatabase}`);
} finally {
  await maintenancePool.end();
}

const appPool = new Pool({
  ...baseConfig,
  database: targetDatabase,
});

try {
  const schemaPath = fileURLToPath(new URL('../data/schema.sql', import.meta.url));
  const schemaSql = await readFile(schemaPath, 'utf8');
  await appPool.query(schemaSql);
  console.log(`Database "${targetDatabase}" reset and seeded successfully.`);
} finally {
  await appPool.end();
}
