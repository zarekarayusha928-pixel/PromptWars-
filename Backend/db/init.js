import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDB() {
  if (!pool) {
    console.error('❌ Cannot initialize database: DATABASE_URL is not configured in Backend/.env.');
    process.exit(1);
  }

  try {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running schema initialization...');
    await pool.query(sql);
    console.log('Database schema initialized successfully.');
  } catch (err) {
    console.error('Error initializing schema:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initDB();
