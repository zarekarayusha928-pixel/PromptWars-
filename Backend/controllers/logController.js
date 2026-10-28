import { query } from '../config/db.js';
import { formatLogRow } from '../utils/formatters.js';

export async function getLogs(req, res, next) {
  const { id } = req.params;

  try {
    const profileCheck = await query('SELECT id FROM profiles WHERE id = $1', [id]);
    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }

    const logsRes = await query(
      'SELECT * FROM symptom_logs WHERE profile_id = $1 ORDER BY log_date ASC',
      [id]
    );

    const logsMap = {};
    for (const row of logsRes.rows) {
      logsMap[row.log_date] = formatLogRow(row);
    }

    res.json(logsMap);
  } catch (err) {
    next(err);
  }
}

export async function upsertLog(req, res, next) {
  const { id, date } = req.params;
  const {
    cycleDay = null,
    bleeding = 'None',
    painScore = 0,
    functionalImpact = false,
    impactTypes = [],
    symptoms = [],
    energyRating = 3,
    moodRating = 3,
    notes = ''
  } = req.body;

  try {
    const profileCheck = await query('SELECT id FROM profiles WHERE id = $1', [id]);
    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }

    const upsertRes = await query(
      `INSERT INTO symptom_logs (
        profile_id, log_date, cycle_day, bleeding, pain_score,
        functional_impact, impact_types, symptoms, energy_rating, mood_rating,
        notes, is_demo, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, NOW())
      ON CONFLICT (profile_id, log_date) DO UPDATE SET
        cycle_day = COALESCE(EXCLUDED.cycle_day, symptom_logs.cycle_day),
        bleeding = EXCLUDED.bleeding,
        pain_score = EXCLUDED.pain_score,
        functional_impact = EXCLUDED.functional_impact,
        impact_types = EXCLUDED.impact_types,
        symptoms = EXCLUDED.symptoms,
        energy_rating = EXCLUDED.energy_rating,
        mood_rating = EXCLUDED.mood_rating,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *`,
      [
        id,
        date,
        cycleDay ? Number(cycleDay) : null,
        bleeding,
        Number(painScore),
        Boolean(functionalImpact),
        impactTypes,
        symptoms,
        Number(energyRating),
        Number(moodRating),
        notes ? notes.trim() : ''
      ]
    );

    res.json(formatLogRow(upsertRes.rows[0]));
  } catch (err) {
    next(err);
  }
}

export async function deleteLog(req, res, next) {
  const { id, date } = req.params;

  try {
    const deleteRes = await query(
      'DELETE FROM symptom_logs WHERE profile_id = $1 AND log_date = $2 RETURNING log_date',
      [id, date]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: `Log entry for '${date}' not found.` });
    }

    res.json({ success: true, deletedDate: date });
  } catch (err) {
    next(err);
  }
}
