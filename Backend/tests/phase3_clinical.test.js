import {
  calculateCycleDayForDate,
  getPhaseInfo,
  computeSummaryMetricsFromLogs,
  getEstimatedNextPeriod
} from '../services/cycleService.js';
import { evaluateClinicalPatterns } from '../services/clinicalEngine.js';
import { evaluateSafetyFlags } from '../services/safetyEngine.js';

async function runClinicalTests() {
  console.log('--- 1. Testing Cycle Calculations ---');
  const phase1 = getPhaseInfo(2, 28, 5);
  if (phase1.phase !== 'Menstrual Phase') throw new Error('Expected Menstrual Phase');

  const phase2 = getPhaseInfo(14, 28, 5);
  if (phase2.phase !== 'Ovulatory Window') throw new Error('Expected Ovulatory Window');

  const phase3 = getPhaseInfo(22, 28, 5);
  if (phase3.phase !== 'Luteal Phase') throw new Error('Expected Luteal Phase');

  const sampleLogs = {
    '2026-10-01': { date: '2026-10-01', cycleDay: 1, bleeding: 'Heavy', painScore: 8, functionalImpact: true, symptoms: ['Severe cramps'] },
    '2026-10-02': { date: '2026-10-02', cycleDay: 2, bleeding: 'Heavy', painScore: 7, functionalImpact: true, symptoms: ['Pelvic pain', 'Fatigue'] },
    '2026-10-03': { date: '2026-10-03', cycleDay: 3, bleeding: 'Heavy', painScore: 6, functionalImpact: false, symptoms: ['Fatigue', 'Brain fog'] },
    '2026-10-14': { date: '2026-10-14', cycleDay: 14, bleeding: 'None', painScore: 5, functionalImpact: false, symptoms: ['Pelvic pressure', 'Acne flare'] }
  };

  const metrics = computeSummaryMetricsFromLogs(sampleLogs);
  if (metrics.totalLoggedDays !== 4) throw new Error('Expected 4 logged days');
  if (metrics.heavyFlowDaysCount !== 3) throw new Error('Expected 3 heavy flow days');
  if (metrics.severePainDaysCount !== 2) throw new Error('Expected 2 severe pain days');

  const nextPeriod = getEstimatedNextPeriod(sampleLogs, { typicalCycleLength: 28 }, '2026-10-15');
  if (!nextPeriod.estimatedDate) throw new Error('Next period date should be estimated');

  console.log('--- 2. Testing Longitudinal Clinical Rules ---');
  const evaluatedPatterns = evaluateClinicalPatterns(sampleLogs, { typicalCycleLength: 28, currentCycleDay: 15 });
  const endoPattern = evaluatedPatterns.find((p) => p.id === 'endometriosis_pattern');
  const anaemiaPattern = evaluatedPatterns.find((p) => p.id === 'anaemia_pattern');

  if (!endoPattern || !endoPattern.matched) throw new Error('Expected Endometriosis pattern to match');
  if (!anaemiaPattern || !anaemiaPattern.matched) throw new Error('Expected Anaemia/Menorrhagia pattern to match');

  console.log('--- 3. Testing Red-Flag Safety Rules ---');
  // 3a. Emergency pain score 9
  const emergencyFlags = evaluateSafetyFlags(
    { date: '2026-10-20', painScore: 9, bleeding: 'Light', symptoms: ['Pelvic pain'] },
    sampleLogs
  );
  if (!emergencyFlags.some((f) => f.id === 'severe-pain-emergency')) {
    throw new Error('Emergency pain flag not triggered');
  }

  // 3b. Heavy bleeding with orthostatic dizziness
  const bleedingDizzyFlags = evaluateSafetyFlags(
    { date: '2026-10-21', bleeding: 'Heavy', painScore: 5, symptoms: ['Dizziness', 'Lightheaded'] },
    sampleLogs
  );
  if (!bleedingDizzyFlags.some((f) => f.id === 'heavy-bleeding-orthostatic')) {
    throw new Error('Heavy bleeding with dizziness flag not triggered');
  }

  // 3c. Prolonged heavy bleeding (3rd consecutive heavy day in sampleLogs)
  const prolongedFlags = evaluateSafetyFlags(sampleLogs['2026-10-03'], sampleLogs);
  if (!prolongedFlags.some((f) => f.id === 'prolonged-heavy-bleeding')) {
    throw new Error('Prolonged heavy bleeding flag not triggered');
  }

  console.log('✅ ALL Phase 3 / Stage 5 Clinical & Safety tests PASSED successfully!');
}

runClinicalTests().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
