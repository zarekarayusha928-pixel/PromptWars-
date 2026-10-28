// Backward-compatibility bridge for seed scripts and existing modules
export {
  hashPassword,
  verifyPassword,
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken
} from './utils/auth.js';
