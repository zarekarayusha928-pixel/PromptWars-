import { query } from '../config/db.js';
import { formatProfile } from '../utils/formatters.js';

export async function getProfile(req, res, next) {
  const { id } = req.params;

  try {
    const profileRes = await query(
      'SELECT * FROM profiles WHERE id = $1',
      [id]
    );

    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }

    const questionsRes = await query(
      'SELECT id, text, in_report, position FROM custom_questions WHERE profile_id = $1 ORDER BY position ASC, created_at ASC',
      [id]
    );

    res.json(formatProfile(profileRes.rows[0], questionsRes.rows));
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  const { id } = req.params;
  const {
    name,
    age,
    typicalCycleLength,
    typicalPeriodLength,
    upcomingVisitDate,
    doctorName,
    primaryPatternFocus,
    summaryBio,
    currentCycleDay,
    currentPhase,
    consentSettings
  } = req.body;

  const ageVal = age !== undefined && age !== '' && age !== null ? Number(age) : null;
  const visitDate = upcomingVisitDate || null;

  try {
    const updateRes = await query(
      `UPDATE profiles
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           typical_cycle_length = COALESCE($3, typical_cycle_length),
           typical_period_length = COALESCE($4, typical_period_length),
           upcoming_visit_date = COALESCE($5, upcoming_visit_date),
           doctor_name = COALESCE($6, doctor_name),
           primary_pattern_focus = COALESCE($7, primary_pattern_focus),
           summary_bio = COALESCE($8, summary_bio),
           current_cycle_day = COALESCE($9, current_cycle_day),
           current_phase = COALESCE($10, current_phase),
           consent_settings = COALESCE($11, consent_settings),
           updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        name ? name.trim() : null,
        ageVal,
        typicalCycleLength ? Number(typicalCycleLength) : null,
        typicalPeriodLength ? Number(typicalPeriodLength) : null,
        visitDate,
        doctorName !== undefined ? doctorName : null,
        primaryPatternFocus !== undefined ? primaryPatternFocus : null,
        summaryBio !== undefined ? summaryBio : null,
        currentCycleDay !== undefined ? Number(currentCycleDay) : null,
        currentPhase !== undefined ? currentPhase : null,
        consentSettings ? JSON.stringify(consentSettings) : null,
        id
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }

    const questionsRes = await query(
      'SELECT id, text, in_report, position FROM custom_questions WHERE profile_id = $1 ORDER BY position ASC, created_at ASC',
      [id]
    );

    res.json(formatProfile(updateRes.rows[0], questionsRes.rows));
  } catch (err) {
    next(err);
  }
}
