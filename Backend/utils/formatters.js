// Data formatting and normalization utilities

export function formatProfile(row, questions = []) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    age: row.age !== null ? row.age : '',
    typicalCycleLength: row.typical_cycle_length,
    typicalPeriodLength: row.typical_period_length,
    upcomingVisitDate: row.upcoming_visit_date || '',
    doctorName: row.doctor_name || '',
    primaryPatternFocus: row.primary_pattern_focus || '',
    summaryBio: row.summary_bio || '',
    currentCycleDay: row.current_cycle_day,
    currentPhase: row.current_phase || '',
    consentSettings: row.consent_settings || {},
    customQuestions: questions.map((q) => ({
      id: q.id,
      text: q.text,
      inReport: q.in_report
    })),
    isDemo: row.is_demo
  };
}

export function formatLogRow(row) {
  if (!row) return null;
  return {
    date: row.log_date,
    cycleDay: row.cycle_day,
    bleeding: row.bleeding,
    painScore: row.pain_score,
    functionalImpact: row.functional_impact,
    impactTypes: row.impact_types || [],
    symptoms: row.symptoms || [],
    energyRating: row.energy_rating,
    moodRating: row.mood_rating,
    notes: row.notes || '',
    updatedAt: row.updated_at
  };
}

export function formatSafetyEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    profileId: row.profile_id,
    eventDate: row.event_date,
    flagId: row.flag_id,
    severity: row.severity,
    title: row.title,
    reason: row.reason,
    action: row.action,
    triggeredFields: row.triggered_fields || [],
    isDemo: row.is_demo,
    createdAt: row.created_at
  };
}

export function isValidDateStr(dateStr) {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return false;
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInMonths = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonths[month - 1];
}

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidProfileId(id) {
  if (typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}
