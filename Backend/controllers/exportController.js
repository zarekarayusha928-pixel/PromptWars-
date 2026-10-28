import { query } from '../config/db.js';
import { formatProfile, formatLogRow } from '../utils/formatters.js';

export async function exportProfile(req, res, next) {
  const { id } = req.params;

  try {
    const profileRes = await query('SELECT * FROM profiles WHERE id = $1', [id]);
    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }

    const questionsRes = await query(
      'SELECT id, text, in_report, position FROM custom_questions WHERE profile_id = $1 ORDER BY position ASC, created_at ASC',
      [id]
    );

    const logsRes = await query(
      'SELECT * FROM symptom_logs WHERE profile_id = $1 ORDER BY log_date ASC',
      [id]
    );

    const logsMap = {};
    for (const row of logsRes.rows) {
      logsMap[row.log_date] = formatLogRow(row);
    }

    const profileObj = formatProfile(profileRes.rows[0], questionsRes.rows);
    profileObj.logs = logsMap;

    const exportPayload = {
      exportVersion: '2.0',
      exportedAt: new Date().toISOString(),
      activeProfileId: id,
      profile: profileObj,
      disclaimer: 'Saheli local-first symptom diary backup. Unvalidated demonstration data.'
    };

    res.json(exportPayload);
  } catch (err) {
    next(err);
  }
}
