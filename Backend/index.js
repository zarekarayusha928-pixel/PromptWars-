import app from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './config/db.js';

const server = app.listen(env.port, async () => {
  console.log(`🌸 Saheli Backend running on port ${env.port} [${env.nodeEnv}]`);
  console.log(`   API endpoints available at http://localhost:${env.port}/api`);
  console.log(`   Allowed CORS origins: ${env.allowedOrigins.join(', ')}`);

  // Non-blocking database connectivity check
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.connected) {
    console.log('✅ PostgreSQL Database connected successfully.');
  } else {
    console.warn(`⚠️  PostgreSQL Database disconnected: ${dbStatus.message}`);
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed.');
  });
});
