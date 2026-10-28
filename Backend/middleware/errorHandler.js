import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS origin not permitted.' });
  }

  // Safe server-side error logging
  console.error(`[SERVER ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  if (!env.isProduction && err.stack) {
    console.error(err.stack);
  }

  // Handle PostgreSQL specific errors
  if (err.code === '23505') {
    // Unique violation
    return res.status(409).json({ error: 'A record with this unique identifier already exists.' });
  }

  if (err.code === '23503') {
    // Foreign key violation
    return res.status(400).json({ error: 'Referenced entity does not exist.' });
  }

  if (err.message && err.message.includes('Database is not configured')) {
    return res.status(503).json({
      error: 'Database service is currently unconfigured. Please configure DATABASE_URL in the backend environment.'
    });
  }

  res.status(err.status || 500).json({
    error: err.status && err.status < 500 ? err.message : 'An internal server error occurred.'
  });
}
