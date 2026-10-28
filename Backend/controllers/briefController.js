import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { formatLogRow } from '../utils/formatters.js';
import {
  computeSummaryMetricsFromLogs,
  calculateCycleDayForDate,
  formatDate
} from '../services/cycleService.js';
import { evaluateClinicalPatterns } from '../services/clinicalEngine.js';

export async function compileVisitBrief(profileId) {
  const profileRes = await query('SELECT * FROM profiles WHERE id = $1', [profileId]);
  if (profileRes.rows.length === 0) return null;
  const profile = profileRes.rows[0];

  const logsRes = await query(
    'SELECT * FROM symptom_logs WHERE profile_id = $1 ORDER BY log_date ASC',
    [profileId]
  );

  const logsMap = {};
  for (const row of logsRes.rows) {
    logsMap[row.log_date] = formatLogRow(row);
  }

  const questionsRes = await query(
    'SELECT id, text, in_report, position FROM custom_questions WHERE profile_id = $1 ORDER BY position ASC, created_at ASC',
    [profileId]
  );

  const consent = profile.consent_settings || {
    includeName: true,
    includeAge: true,
    includeNotes: true,
    includeMood: true,
    includeTrends: true
  };

  const metrics = computeSummaryMetricsFromLogs(logsMap);
  const patterns = evaluateClinicalPatterns(logsMap, {
    typicalCycleLength: profile.typical_cycle_length,
    typicalPeriodLength: profile.typical_period_length,
    currentCycleDay: profile.current_cycle_day
  }).filter((p) => p.matched);

  const activeQuestions = questionsRes.rows
    .filter((q) => q.in_report !== false)
    .map((q) => q.text);

  // Peak pain days breakdown
  const peakPainDays = Object.values(logsMap)
    .filter((l) => (Number(l.painScore) || 0) >= 7)
    .map((l) => ({
      date: l.date,
      cycleDay: l.cycleDay,
      painScore: l.painScore,
      functionalImpact: l.functionalImpact,
      symptoms: l.symptoms
    }));

  return {
    reportVersion: '2.0',
    generatedAt: new Date().toISOString(),
    patient: {
      id: profile.id,
      name: consent.includeName ? profile.name : `Patient ${profile.id.substring(0, 8)}`,
      age: consent.includeAge && profile.age !== null ? profile.age : 'Undisclosed',
      typicalCycleLength: profile.typical_cycle_length,
      typicalPeriodLength: profile.typical_period_length,
      doctorName: profile.doctor_name || '',
      upcomingVisitDate: profile.upcoming_visit_date || ''
    },
    consentSettings: consent,
    summaryMetrics: metrics,
    chiefClinicalPatterns: patterns,
    discussionQuestions: activeQuestions,
    peakPainOccurrences: peakPainDays,
    disclaimer: 'Observational patient symptom brief designed for consultation advocacy. Demonstration evidence only, not a formal medical diagnosis.'
  };
}

export async function getVisitBrief(req, res, next) {
  const { id } = req.params;

  try {
    const brief = await compileVisitBrief(id);
    if (!brief) {
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }
    res.json(brief);
  } catch (err) {
    next(err);
  }
}

export async function createShareLink(req, res, next) {
  const { id } = req.params;
  const { expiresInHours = 24 } = req.body || {};

  const hours = Math.min(Math.max(Number(expiresInHours) || 24, 1), 72); // 1h to 72h max

  try {
    const profileCheck = await query('SELECT id FROM profiles WHERE id = $1', [id]);
    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }

    const shareToken = jwt.sign(
      {
        profileId: id,
        type: 'clinician_share',
        permissions: ['read_brief']
      },
      env.jwtSecret,
      { expiresIn: `${hours}h` }
    );

    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    res.json({
      success: true,
      shareToken,
      expiresAt,
      expiresInHours: hours,
      shareUrl: `/shared/brief/${shareToken}`
    });
  } catch (err) {
    next(err);
  }
}

export async function getSharedBrief(req, res, next) {
  const { token } = req.params;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing share token.' });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch {
      return res.status(401).json({
        error: 'This clinician share link is invalid or has expired. Please ask the patient for an updated link.'
      });
    }

    if (decoded.type !== 'clinician_share' || !decoded.profileId) {
      return res.status(403).json({ error: 'Invalid share token format.' });
    }

    const brief = await compileVisitBrief(decoded.profileId);
    if (!brief) {
      return res.status(404).json({ error: 'Patient health profile not found.' });
    }

    res.json(brief);
  } catch (err) {
    next(err);
  }
}
