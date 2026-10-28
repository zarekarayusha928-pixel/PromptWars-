import { verifyAccessToken } from '../utils/auth.js';

// Middleware: Require valid Access Token
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload || !payload.userId) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }

  req.user = payload;
  next();
}

// Middleware: Enforce Object-Level Authorization (BOLA/IDOR protection)
// Ensures the authenticated user can ONLY access and mutate their own profile
export function requireProfileOwnership(req, res, next) {
  if (!req.user || !req.user.profileId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const targetProfileId = req.params.id;
  if (!targetProfileId) {
    return res.status(400).json({ error: 'Missing profile ID parameter.' });
  }

  if (req.user.profileId !== targetProfileId) {
    return res.status(403).json({
      error: 'Forbidden: You do not have permission to access or modify this health profile.'
    });
  }

  next();
}

// Middleware: Optional Authentication (attaches req.user if valid token provided)
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    if (payload && payload.userId) {
      req.user = payload;
    }
  }
  next();
}
