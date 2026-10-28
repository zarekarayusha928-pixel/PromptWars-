import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import app from '../app.js';
import http from 'http';
import { generateAccessToken } from '../utils/auth.js';

async function runBriefTests() {
  console.log('--- 1. Testing Clinician Share Link Generation & Verification ---');
  const validToken = jwt.sign(
    { profileId: 'amara', type: 'clinician_share', permissions: ['read_brief'] },
    env.jwtSecret,
    { expiresIn: '24h' }
  );

  const expiredToken = jwt.sign(
    { profileId: 'amara', type: 'clinician_share', permissions: ['read_brief'] },
    env.jwtSecret,
    { expiresIn: '-1s' }
  );

  const wrongTypeToken = jwt.sign(
    { profileId: 'amara', type: 'access' },
    env.jwtSecret,
    { expiresIn: '15m' }
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(4093, resolve));

  try {
    // 1a. Attempt to access shared brief with expired token (expect 401)
    const expRes = await fetch(`http://localhost:4093/api/shared/brief/${expiredToken}`);
    console.log('Expired share token status (expect 401):', expRes.status);
    if (expRes.status !== 401) throw new Error('Expected 401 for expired token');

    // 1b. Attempt to access with wrong token type (expect 403)
    const typeRes = await fetch(`http://localhost:4093/api/shared/brief/${wrongTypeToken}`);
    console.log('Wrong token type status (expect 403):', typeRes.status);
    if (typeRes.status !== 403) throw new Error('Expected 403 for non-share token');

    // 1c. Attempt to access protected endpoint /api/profiles/amara/visit-brief without auth (expect 401)
    const unauthBriefRes = await fetch('http://localhost:4093/api/profiles/amara/visit-brief');
    console.log('Unauthenticated visit-brief status (expect 401):', unauthBriefRes.status);
    if (unauthBriefRes.status !== 401) throw new Error('Expected 401 for unauth brief');

    // 1d. BOLA attempt: User Priya trying to create a share link for Amara (expect 403)
    const priyaToken = generateAccessToken({ userId: 'u_priya', email: 'priya@test.com', profileId: 'priya' });
    const bolaRes = await fetch('http://localhost:4093/api/profiles/amara/share-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${priyaToken}`
      },
      body: JSON.stringify({ expiresInHours: 24 })
    });
    console.log('BOLA share-link attempt status (expect 403):', bolaRes.status);
    if (bolaRes.status !== 403) throw new Error('Expected 403 for BOLA share link creation');

    console.log('✅ ALL Phase 4 / Stage 6 Clinician Brief & Sharing tests PASSED successfully!');
  } finally {
    server.close();
  }
}

runBriefTests().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
