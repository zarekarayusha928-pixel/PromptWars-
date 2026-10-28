import { Router } from 'express';
import { checkDatabaseConnection } from '../config/db.js';

const router = Router();

router.get('/health', async (req, res) => {
  const dbStatus = await checkDatabaseConnection();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus.connected ? 'connected' : 'disconnected'
  });
});

export default router;
