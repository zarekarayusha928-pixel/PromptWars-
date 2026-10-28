import { query } from '../config/db.js';
import { formatLogRow } from '../utils/formatters.js';
import {
  computeSummaryMetricsFromLogs,
  getEstimatedNextPeriod,
  calculateCycleDayForDate,
  formatDate
} from '../services/cycleService.js';
import { evaluateClinicalPatterns } from '../services/clinicalEngine.js';

export async function getInsights(req, res, next) {
  const { id } = req.params;

  try {
    const profileRes = await query('SELECT * FROM profiles WHERE id = $1', [id]);
    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }
    const profile = profileRes.rows[0];

    const logsRes = await query(
      'SELECT * FROM symptom_logs WHERE profile_id = $1 ORDER BY log_date ASC',
      [id]
    );

    const logsMap = {};
    for (const row of logsRes.rows) {
      logsMap[row.log_date] = formatLogRow(row);
    }

    const metrics = computeSummaryMetricsFromLogs(logsMap);
    const patterns = evaluateClinicalPatterns(logsMap, {
      typicalCycleLength: profile.typical_cycle_length,
      typicalPeriodLength: profile.typical_period_length,
      currentCycleDay: profile.current_cycle_day
    });
    const nextPeriod = getEstimatedNextPeriod(logsMap, {
      typicalCycleLength: profile.typical_cycle_length,
      currentCycleDay: profile.current_cycle_day
    });

    res.json({
      profileId: id,
      metrics,
      nextPeriod,
      patterns,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

export async function getCycleSummary(req, res, next) {
  const { id } = req.params;

  try {
    const profileRes = await query('SELECT * FROM profiles WHERE id = $1', [id]);
    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: `Profile '${id}' not found.` });
    }
    const profile = profileRes.rows[0];

    const logsRes = await query(
      'SELECT * FROM symptom_logs WHERE profile_id = $1 ORDER BY log_date ASC',
      [id]
    );

    const logsMap = {};
    for (const row of logsRes.rows) {
      logsMap[row.log_date] = formatLogRow(row);
    }

    const todayStr = formatDate(new Date());
    const cycleDayInfo = calculateCycleDayForDate(todayStr, logsMap, {
      typicalCycleLength: profile.typical_cycle_length,
      typicalPeriodLength: profile.typical_period_length,
      currentCycleDay: profile.current_cycle_day
    });
    const nextPeriod = getEstimatedNextPeriod(logsMap, {
      typicalCycleLength: profile.typical_cycle_length,
      currentCycleDay: profile.current_cycle_day
    });

    res.json({
      profileId: id,
      date: todayStr,
      ...cycleDayInfo,
      nextPeriod
    });
  } catch (err) {
    next(err);
  }
}
