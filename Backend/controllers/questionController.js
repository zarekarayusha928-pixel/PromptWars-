import { pool, query } from '../config/db.js';

export async function getQuestions(req, res, next) {
  const { id } = req.params;

  try {
    const profileCheck = await query('SELECT id FROM profiles WHERE id = $1', [id]);
    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }

    const questionsRes = await query(
      'SELECT id, text, in_report, position FROM custom_questions WHERE profile_id = $1 ORDER BY position ASC, created_at ASC',
      [id]
    );

    const questions = questionsRes.rows.map((q) => ({
      id: q.id,
      text: q.text,
      inReport: q.in_report
    }));

    res.json(questions);
  } catch (err) {
    next(err);
  }
}

export async function updateQuestions(req, res, next) {
  const { id } = req.params;
  const { questions } = req.body;

  if (!pool) {
    return res.status(503).json({ error: 'Database service is unconfigured.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure profile exists
    const profileCheck = await client.query('SELECT id FROM profiles WHERE id = $1', [id]);
    if (profileCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }

    // Replace questions in transaction
    await client.query('DELETE FROM custom_questions WHERE profile_id = $1', [id]);

    const inserted = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = q.id || `q-${i + 1}-${Date.now()}`;
      const inReport = q.inReport !== false;

      const resInsert = await client.query(
        `INSERT INTO custom_questions (id, profile_id, text, in_report, position, is_demo)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING id, text, in_report`,
        [qId, id, q.text.trim(), inReport, i]
      );
      inserted.push({
        id: resInsert.rows[0].id,
        text: resInsert.rows[0].text,
        inReport: resInsert.rows[0].in_report
      });
    }

    await client.query('COMMIT');
    res.json(inserted);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}
