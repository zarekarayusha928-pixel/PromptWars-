import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  if (!pool) {
    console.error('❌ Cannot run migrations: DATABASE_URL is not configured in Backend/.env.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log('📦 Checking database migrations...');

    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const executedRes = await client.query('SELECT name FROM _migrations');
    const executed = new Set(executedRes.rows.map((r) => r.name));

    const migrationsDir = path.resolve(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found.');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (!executed.has(file)) {
        console.log(`⏳ Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');

        console.log(`✅ Applied migration: ${file}`);
        count++;
      }
    }

    if (count === 0) {
      console.log('✨ All migrations are up to date.');
    } else {
      console.log(`🎉 Successfully executed ${count} new migration(s).`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations();
}

export { runMigrations };
