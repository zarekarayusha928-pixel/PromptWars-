import app from '../app.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from '../utils/auth.js';
import http from 'http';

async function runTests() {
  console.log('--- 1. Testing Password Hashing & Verification ---');
  const hash = hashPassword('secret123');
  if (!hash.startsWith('$2')) throw new Error('Expected bcrypt hash');
  if (!verifyPassword('secret123', hash)) throw new Error('Verification failed for valid password');
  if (verifyPassword('wrongpassword', hash)) throw new Error('Verification should fail for wrong password');
  if (verifyPassword('secret123', 'secret123')) throw new Error('Plain text password comparison must be rejected');

  console.log('--- 2. Testing JWT Access & Refresh Tokens ---');
  const access = generateAccessToken({ userId: 'u1', email: 'test@saheli.health', profileId: 'amara' });
  const refresh = generateRefreshToken({ userId: 'u1', email: 'test@saheli.health', profileId: 'amara' });
  const decodedAccess = verifyAccessToken(access);
  const decodedRefresh = verifyRefreshToken(refresh);
  if (!decodedAccess || decodedAccess.profileId !== 'amara' || decodedAccess.type !== 'access') {
    throw new Error('Access token verification failed');
  }
  if (!decodedRefresh || decodedRefresh.profileId !== 'amara' || decodedRefresh.type !== 'refresh') {
    throw new Error('Refresh token verification failed');
  }
  if (verifyRefreshToken(access) !== null) {
    throw new Error('Access token should not verify as refresh token');
  }

  console.log('--- 3. Testing HTTP Security & Authorization ---');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(4095, resolve));

  try {
    // 3a. Unauthenticated request to protected endpoint
    const unauthRes = await fetch('http://localhost:4095/api/profiles/amara');
    if (unauthRes.status !== 401) throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
    if (unauthRes.headers.get('x-content-type-options') !== 'nosniff') throw new Error('Helmet nosniff header missing');

    // 3b. BOLA / IDOR protection: User Amara attempting to access Priya's profile
    const bolaRes = await fetch('http://localhost:4095/api/profiles/priya', {
      headers: { Authorization: 'Bearer ' + access }
    });
    if (bolaRes.status !== 403) throw new Error(`Expected 403 Forbidden for BOLA access, got ${bolaRes.status}`);

    console.log('✅ All Phase 2 security and access control tests PASSED!');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
