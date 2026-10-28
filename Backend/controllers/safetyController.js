import { query } from '../config/db.js';
import { formatSafetyEvent, isValidDateStr } from '../utils/formatters.js';

export async function getSafetyEvents(req, res, next) {
  const { id } = req.params;

  try {
    const profileCheck = await query('SELECT id FROM profiles WHERE id = $1', [id]);
    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }

    const eventsRes = await query(
      'SELECT * FROM safety_events WHERE profile_id = $1 ORDER BY event_date DESC, created_at DESC',
      [id]
    );

    const events = eventsRes.rows.map(formatSafetyEvent);
    res.json(events);
  } catch (err) {
    next(err);
  }
}

export async function createSafetyEvent(req, res, next) {
  const { id } = req.params;
  const {
    eventDate,
    triggeredDate,
    date,
    flagId,
    id: bodyId,
    severity,
    title,
    reason,
    action,
    triggeredFields
  } = req.body;

  const targetDate = eventDate || triggeredDate || date || new Date().toISOString().split('T')[0];
  if (!isValidDateStr(targetDate)) {
    return res.status(400).json({ error: 'Invalid event date format. Expected YYYY-MM-DD.' });
  }

  const finalFlagId = flagId || bodyId || 'unspecified-safety-flag';
  const finalSeverity = severity || 'urgent';
  const finalTitle = title || 'Safety Notice';
  const finalReason = reason || '';
  const finalAction = action || 'Consult clinician or urgent services.';
  const finalFields = Array.isArray(triggeredFields) ? triggeredFields : [];

  try {
    const profileCheck = await query('SELECT id FROM profiles WHERE id = $1', [id]);
    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }

    const insertRes = await query(
      `INSERT INTO safety_events (
        profile_id, event_date, flag_id, severity, title, reason, action, triggered_fields, is_demo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
      RETURNING *`,
      [id, targetDate, finalFlagId, finalSeverity, finalTitle, finalReason, finalAction, finalFields]
    );

    res.status(201).json({
      success: true,
      event: formatSafetyEvent(insertRes.rows[0])
    });
  } catch (err) {
    next(err);
  }
}
