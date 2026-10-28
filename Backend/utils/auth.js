import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

const BCRYPT_SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';  // 7 days

// Hash password with bcrypt
export function hashPassword(password) {
  return bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
}

// Verify password against stored hash (supports bcrypt and legacy scrypt)
export function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;

  // 1. Bcrypt hash check (starts with $2a$, $2b$, or $2y$)
  if (storedHash.startsWith('$2')) {
    try {
      return bcrypt.compareSync(password, storedHash);
    } catch {
      return false;
    }
  }

  // 2. Legacy scrypt hash format support (salt:derivedKey)
  if (storedHash.includes(':')) {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;

    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const derivedKey = crypto.scryptSync(password, salt, 64);
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    } catch {
      return false;
    }
  }

  // Strict: plain-text fallback is completely disabled for security
  return false;
}

// Generate Access Token (short-lived, 15 min)
export function generateAccessToken(payloadObj, secretKey = env.jwtSecret) {
  return jwt.sign(
    {
      userId: payloadObj.userId,
      email: payloadObj.email,
      profileId: payloadObj.profileId,
      type: 'access'
    },
    secretKey,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

// Generate Refresh Token (long-lived, 7 days)
export function generateRefreshToken(payloadObj, secretKey = env.jwtSecret) {
  return jwt.sign(
    {
      userId: payloadObj.userId,
      email: payloadObj.email,
      profileId: payloadObj.profileId,
      type: 'refresh'
    },
    secretKey,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

// Backward-compatibility wrapper for generateToken
export function generateToken(payloadObj, secretKey = env.jwtSecret) {
  return generateAccessToken(payloadObj, secretKey);
}

// Verify Access Token
export function verifyAccessToken(token, secretKey = env.jwtSecret) {
  if (!token || typeof token !== 'string') return null;
  try {
    const decoded = jwt.verify(token, secretKey);
    if (decoded.type && decoded.type !== 'access') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// Verify Refresh Token
export function verifyRefreshToken(token, secretKey = env.jwtSecret) {
  if (!token || typeof token !== 'string') return null;
  try {
    const decoded = jwt.verify(token, secretKey);
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// Backward-compatibility wrapper for verifyToken
export function verifyToken(token, secretKey = env.jwtSecret) {
  return verifyAccessToken(token, secretKey);
}
