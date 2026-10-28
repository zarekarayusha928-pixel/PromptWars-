import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import sharedRoutes from './sharedRoutes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/profiles', profileRoutes);
apiRouter.use('/shared', sharedRoutes);

export default apiRouter;
