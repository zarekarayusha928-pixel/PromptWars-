import { Router } from 'express';
import { login, signup, me, logout, refresh } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, signupSchema } from '../validators/schemas.js';

const router = Router();

router.post('/login', validate(loginSchema, 'body'), login);
router.post('/signup', validate(signupSchema, 'body'), signup);
router.post('/refresh', refresh);
router.get('/me', requireAuth, me);
router.post('/logout', logout);

export default router;
