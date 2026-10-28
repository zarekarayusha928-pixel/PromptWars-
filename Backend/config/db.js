import pg from 'pg';
import { env } from './env.js';

// Ensure DATE columns (OID 1082) return as raw YYYY-MM-DD strings without timezone shifting
pg.types.setTypeParser(1082, (val) => val);

let poolInstance = null;

if (!env.databaseUrl) {
  console.warn(
    '⚠️ [DATABASE WARNING] DATABASE_URL is not set in Backend/.env.\n' +
    'Database queries will fail until a valid PostgreSQL connection string is configured.'
  );
} else {
  poolInstance = new pg.Pool({
    connectionString: env.databaseUrl,
    ssl: env.databaseUrl.includes('sslmode=require') || env.databaseUrl.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  poolInstance.on('error', (err) => {
    console.error('❌ Unexpected database client error in pool:', err.message);
  });
}

export const pool = poolInstance;

export async function query(text, params) {
  if (!poolInstance) {
    throw new Error(
      'Database is not configured. Please define DATABASE_URL in Backend/.env with your PostgreSQL / Neon connection string.'
    );
  }
  return poolInstance.query(text, params);
}

export async function checkDatabaseConnection() {
  if (!poolInstance) {
    return {
      connected: false,
      message: 'DATABASE_URL environment variable is missing.'
    };
  }
  try {
    const res = await poolInstance.query('SELECT NOW() as current_time');
    return {
      connected: true,
      time: res.rows[0].current_time
    };
  } catch (err) {
    return {
      connected: false,
      message: err.message
    };
  }
}
