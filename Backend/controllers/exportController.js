import { pool, query } from '../config/db.js';
import { formatProfile, formatLogRow, isValidDateStr } from '../utils/formatters.js';

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

export async function importProfileData(req, res, next) {
  const { id } = req.params;
  const payload = req.body || {};

  const profileData = payload.profile || payload;
  const logsToImport = profileData.logs || {};
  const questionsToImport = profileData.customQuestions || [];

  if (!pool) {
    return res.status(503).json({ error: 'Database service is unconfigured.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify target profile exists
    const profileCheck = await client.query('SELECT id FROM profiles WHERE id = $1', [id]);
    if (profileCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }

    let importedLogsCount = 0;
    for (const [dateStr, logEntry] of Object.entries(logsToImport)) {
      if (!isValidDateStr(dateStr)) continue;

      const bleeding = ['None', 'Spotting', 'Light', 'Medium', 'Heavy'].includes(logEntry.bleeding)
        ? logEntry.bleeding
        : 'None';
      const painScore = Math.min(Math.max(Number(logEntry.painScore) || 0, 0), 10);
      const energyRating = Math.min(Math.max(Number(logEntry.energyRating) || 3, 1), 5);
      const moodRating = Math.min(Math.max(Number(logEntry.moodRating) || 3, 1), 5);
      const cycleDay = logEntry.cycleDay ? Number(logEntry.cycleDay) : null;
      const functionalImpact = Boolean(logEntry.functionalImpact);
      const impactTypes = Array.isArray(logEntry.impactTypes) ? logEntry.impactTypes : [];
      const symptoms = Array.isArray(logEntry.symptoms) ? logEntry.symptoms : [];
      const notes = typeof logEntry.notes === 'string' ? logEntry.notes.substring(0, 500) : '';

      await client.query(
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
          updated_at = NOW()`,
        [id, dateStr, cycleDay, bleeding, painScore, functionalImpact, impactTypes, symptoms, energyRating, moodRating, notes]
      );
      importedLogsCount++;
    }

    let importedQuestionsCount = 0;
    if (Array.isArray(questionsToImport) && questionsToImport.length > 0) {
      await client.query('DELETE FROM custom_questions WHERE profile_id = $1', [id]);
      for (let i = 0; i < questionsToImport.length; i++) {
        const q = questionsToImport[i];
        if (!q || !q.text || typeof q.text !== 'string') continue;

        const qId = q.id || `q-${i + 1}-${Date.now()}`;
        const inReport = q.inReport !== false;

        await client.query(
          `INSERT INTO custom_questions (id, profile_id, text, in_report, position, is_demo)
           VALUES ($1, $2, $3, $4, $5, false)`,
          [qId, id, q.text.trim().substring(0, 500), inReport, i]
        );
        importedQuestionsCount++;
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Health diary backup imported successfully.',
      importedLogsCount,
      importedQuestionsCount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

export async function deleteProfileData(req, res, next) {
  const { id } = req.params;

  if (!pool) {
    return res.status(503).json({ error: 'Database service is unconfigured.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete all health logs, safety alerts, and questions
    const delLogs = await client.query('DELETE FROM symptom_logs WHERE profile_id = $1', [id]);
    const delSafety = await client.query('DELETE FROM safety_events WHERE profile_id = $1', [id]);
    const delQuestions = await client.query('DELETE FROM custom_questions WHERE profile_id = $1', [id]);

    // Anonymize and reset profile metadata
    await client.query(
      `UPDATE profiles
       SET primary_pattern_focus = '',
           summary_bio = '',
           doctor_name = '',
           upcoming_visit_date = null,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'All patient health data, symptom logs, and discussion questions have been permanently deleted.',
      deletedRecords: {
        logs: delLogs.rowCount,
        safetyEvents: delSafety.rowCount,
        questions: delQuestions.rowCount
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}
