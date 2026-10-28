// Observational Rule-Based Red-Flag Safety Engine
// Pure, deterministic rules for acute symptom triage

function textMatchesAny(text, keywords = []) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

export function evaluateSafetyFlags(entry, allLogs = {}) {
  if (!entry) return [];

  const flags = [];
  const entryDate = entry.date || new Date().toISOString().split('T')[0];
  const painNum = entry.painScore !== undefined && entry.painScore !== null ? Number(entry.painScore) : null;
  const symptoms = Array.isArray(entry.symptoms) ? entry.symptoms : [];
  const notesText = typeof entry.notes === 'string' ? entry.notes : '';

  // 1. Emergency Pain Intensity (Pain Score 9 - 10)
  if (painNum !== null && painNum >= 9) {
    flags.push({
      id: 'severe-pain-emergency',
      severity: 'urgent',
      title: 'Emergency Pain Intensity (Score ≥ 9/10)',
      reason: `Pain intensity recorded at ${painNum}/10 (emergency threshold). Sudden, severe pelvic or abdominal pain warrants prompt medical attention to evaluate acute causes.`,
      action: 'Seek emergency medical evaluation immediately. Do not wait for a routine clinic appointment.',
      triggeredFields: ['painScore'],
      triggeredDate: entryDate
    });
  }

  // 2. Severe Pain with Fainting, Syncope, or Vomiting
  const hasFaintOrVomitInNotes = textMatchesAny(notesText, ['faint', 'syncope', 'passed out', 'blackout', 'vomit', 'throwing up']);
  const hasFaintOrVomitInSymptoms = symptoms.some((s) => textMatchesAny(s, ['faint', 'syncope', 'drowsiness', 'nausea', 'vomit']));
  if (painNum !== null && painNum >= 7 && (hasFaintOrVomitInNotes || hasFaintOrVomitInSymptoms)) {
    flags.push({
      id: 'severe-pain-fainting-vomiting',
      severity: 'urgent',
      title: 'Severe Pain with Fainting or Systemic Symptoms',
      reason: `Severe pain (${painNum}/10) recorded alongside dizziness, fainting, or vomiting. This combination may indicate acute pelvic pathology requiring urgent clinical evaluation.`,
      action: 'Contact emergency medical services or go to the nearest emergency department.',
      triggeredFields: ['painScore', 'notes', 'symptoms'],
      triggeredDate: entryDate
    });
  }

  // 3. Heavy Bleeding with Orthostatic Symptoms (Dizziness / Fainting)
  const isHeavyBleeding = entry.bleeding === 'Heavy';
  const hasOrthostaticSymptoms = symptoms.some((s) => textMatchesAny(s, ['dizziness', 'faint', 'lightheaded', 'brain fog']));
  if (isHeavyBleeding && (hasOrthostaticSymptoms || textMatchesAny(notesText, ['dizzy', 'faint', 'soaked', 'hourly']))) {
    flags.push({
      id: 'heavy-bleeding-orthostatic',
      severity: 'urgent',
      title: 'Heavy Bleeding with Dizziness / Orthostatic Symptoms',
      reason: 'Heavy menstrual flow reported with dizziness or lightheadedness, indicating potential acute hypovolemia or hemodynamic compromise.',
      action: 'Seek immediate urgent medical evaluation.',
      triggeredFields: ['bleeding', 'symptoms', 'notes'],
      triggeredDate: entryDate
    });
  }

  // 4. Prolonged Heavy Bleeding (>= 3 consecutive days in logs)
  if (isHeavyBleeding) {
    const dates = Object.keys(allLogs).sort();
    let consecutiveHeavy = 1;
    const entryIdx = dates.indexOf(entryDate);
    if (entryIdx > 0) {
      for (let i = entryIdx - 1; i >= 0; i--) {
        if (allLogs[dates[i]]?.bleeding === 'Heavy') {
          consecutiveHeavy++;
        } else {
          break;
        }
      }
    }
    if (consecutiveHeavy >= 3) {
      flags.push({
        id: 'prolonged-heavy-bleeding',
        severity: 'warning',
        title: `Prolonged Heavy Bleeding (${consecutiveHeavy} consecutive days)`,
        reason: `${consecutiveHeavy} consecutive days of heavy flow recorded. Sustained hemorrhage increases iron deficiency risk.`,
        action: 'Contact your gynecologist or healthcare clinic for timely evaluation.',
        triggeredFields: ['bleeding'],
        triggeredDate: entryDate
      });
    }
  }

  return flags;
}
