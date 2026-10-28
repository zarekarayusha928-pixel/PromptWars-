import { pool, query } from '../config/db.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/auth.js';
import { formatProfile } from '../utils/formatters.js';

export async function login(req, res, next) {
  const { email, password } = req.body;

  try {
    const userRes = await query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];
    const isMatch = verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Retrieve linked profile
    let profileData = null;
    if (user.profile_id) {
      const profRes = await query('SELECT * FROM profiles WHERE id = $1', [user.profile_id]);
      if (profRes.rows.length > 0) {
        const qRes = await query(
          'SELECT id, text, in_report, position FROM custom_questions WHERE profile_id = $1 ORDER BY position ASC, created_at ASC',
          [user.profile_id]
        );
        profileData = formatProfile(profRes.rows[0], qRes.rows);
      }
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      profileId: user.profile_id
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.json({
      success: true,
      token: accessToken, // backward compatibility
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileId: user.profile_id,
        isDemo: user.is_demo
      },
      profile: profileData
    });
  } catch (err) {
    next(err);
  }
}

export async function signup(req, res, next) {
  const { name, email, password } = req.body;

  if (!pool) {
    return res.status(503).json({ error: 'Database service is unconfigured.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if email already exists
    const existing = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    // Create a new user profile
    const profileId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newProfileRes = await client.query(
      `INSERT INTO profiles (
        id, name, age, typical_cycle_length, typical_period_length,
        upcoming_visit_date, doctor_name, primary_pattern_focus, summary_bio,
        current_cycle_day, current_phase, consent_settings, is_demo, created_at, updated_at
      ) VALUES ($1, $2, null, 28, 5, null, '', 'Personal Symptom Diary', 'Private symptom diary.', 1, 'Follicular Phase', '{"includeName": true, "includeAge": true, "includeNotes": true, "includeMood": true, "includeTrends": true}'::jsonb, false, NOW(), NOW())
      RETURNING *`,
      [profileId, name.trim()]
    );

    // Create default question
    const defaultQuestionId = `q1_${Date.now()}`;
    const defaultQuestionText = 'How do my tracked symptoms compare to expected menstrual patterns?';
    await client.query(
      `INSERT INTO custom_questions (id, profile_id, text, in_report, position, is_demo, created_at)
       VALUES ($1, $2, $3, true, 0, false, NOW())`,
      [defaultQuestionId, profileId, defaultQuestionText]
    );

    // Create user record with bcrypt password hash
    const userId = `u_${Date.now()}`;
    const passwordHash = hashPassword(password);
    const userRes = await client.query(
      `INSERT INTO users (id, email, password_hash, name, profile_id, is_demo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
       RETURNING id, email, name, profile_id, is_demo`,
      [userId, email.trim().toLowerCase(), passwordHash, name.trim(), profileId]
    );

    await client.query('COMMIT');

    const createdUser = userRes.rows[0];
    const tokenPayload = {
      userId: createdUser.id,
      email: createdUser.email,
      profileId: createdUser.profile_id
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const formatted = formatProfile(newProfileRes.rows[0], [
      { id: defaultQuestionId, text: defaultQuestionText, in_report: true }
    ]);

    res.status(201).json({
      success: true,
      token: accessToken, // backward compatibility
      accessToken,
      refreshToken,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        profileId: createdUser.profile_id,
        isDemo: createdUser.is_demo
      },
      profile: formatted
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

export async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload || !payload.userId) {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }

  const newAccessToken = generateAccessToken({
    userId: payload.userId,
    email: payload.email,
    profileId: payload.profileId
  });

  res.json({
    success: true,
    token: newAccessToken,
    accessToken: newAccessToken
  });
}

export async function me(req, res, next) {
  try {
    const userRes = await query(
      'SELECT id, email, name, profile_id, is_demo FROM users WHERE id = $1',
      [req.user.userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const user = userRes.rows[0];
    let profileData = null;
    if (user.profile_id) {
      const profRes = await query('SELECT * FROM profiles WHERE id = $1', [user.profile_id]);
      if (profRes.rows.length > 0) {
        const qRes = await query(
          'SELECT id, text, in_report, position FROM custom_questions WHERE profile_id = $1 ORDER BY position ASC, created_at ASC',
          [user.profile_id]
        );
        profileData = formatProfile(profRes.rows[0], qRes.rows);
      }
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileId: user.profile_id,
        isDemo: user.is_demo
      },
      profile: profileData
    });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res) {
  res.json({ success: true, message: 'Logged out successfully.' });
}
