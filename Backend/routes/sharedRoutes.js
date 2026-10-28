import { Router } from 'express';
import { getSharedBrief } from '../controllers/briefController.js';

const router = Router();

// Public doctor portal view accessed via signed temporary share token
router.get('/brief/:token', getSharedBrief);

export default router;
