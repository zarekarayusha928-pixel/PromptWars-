// Longitudinal Clinical Pattern Detection Service
// Non-diagnostic demonstration rules aligned with ESHRE, ACOG, and Rotterdam criteria

export const CLINICAL_RULES = [
  {
    id: 'endometriosis_pattern',
    title: 'Severe Cyclical Pelvic Pain & Dysmenorrhea Pattern',
    category: 'Pelvic Pain & Dysmenorrhea',
    badgeColor: 'berry',
    status: 'Demonstration Pattern (Non-diagnostic)',
    description: 'A cyclical pattern of severe menstrual cramping accompanied by non-menstrual pelvic pain, catamenial gastrointestinal symptoms, or functional disruption.',
    clinicalRationale:
      'According to ESHRE and ACOG guidelines, endometriosis frequently presents with severe dysmenorrhea unresponsive to standard NSAIDs, acyclic pelvic pain, deep dyspareunia, and cyclical bowel symptoms. The average delay from symptom onset to diagnosis remains 7 to 10 years.',
    literatureBasis:
      'ESHRE Guideline: Endometriosis (2022); ACOG Practice Bulletin No. 114: Management of Endometriosis.',
    evaluate: (logs = {}) => {
      const logEntries = Object.values(logs);
      if (logEntries.length === 0) {
        return {
          matched: false,
          severity: 'Insufficient Data',
          sampleSize: 0,
          dateRange: null,
          evidence: [],
          suggestedClinicianQuestions: []
        };
      }

      const evidence = [];
      const matchingDates = [];

      // Criterion 1: Severe menstrual pain (painScore >= 7)
      const severePainEntries = logEntries.filter((e) => (Number(e.painScore) || 0) >= 7);
      if (severePainEntries.length > 0) {
        severePainEntries.forEach((e) => { if (e.date) matchingDates.push(e.date); });
        evidence.push({
          criterion: 'Severe Pain Intensity (Score ≥ 7/10)',
          sampleCount: severePainEntries.length,
          dates: severePainEntries.map((e) => e.date).filter(Boolean),
          detail: `Severe pelvic pain (≥7/10) documented on ${severePainEntries.length} logged day(s). High pain intensity often warrants dedicated clinical investigation.`
        });
      }

      // Criterion 2: Non-menstrual or mid-cycle pain
      const acyclicPainEntries = logEntries.filter(
        (e) => (e.bleeding === 'None' || !e.bleeding) && (Number(e.painScore) || 0) >= 4
      );
      if (acyclicPainEntries.length > 0) {
        acyclicPainEntries.forEach((e) => { if (e.date) matchingDates.push(e.date); });
        evidence.push({
          criterion: 'Acyclic / Mid-Cycle Pelvic Pain',
          sampleCount: acyclicPainEntries.length,
          dates: acyclicPainEntries.map((e) => e.date).filter(Boolean),
          detail: `Pelvic pain outside of active bleeding recorded on ${acyclicPainEntries.length} day(s), suggestive of possible ovulatory or non-menstrual pelvic inflammation.`
        });
      }

      // Criterion 3: Deep pelvic pressure or bowel symptoms
      const bowelOrPelvicPain = logEntries.filter((e) =>
        (e.symptoms || []).some((s) =>
          typeof s === 'string' && (s.toLowerCase().includes('bowel') || s.toLowerCase().includes('pelvic') || s.toLowerCase().includes('cramp'))
        )
      );
      if (bowelOrPelvicPain.length > 0) {
        bowelOrPelvicPain.forEach((e) => { if (e.date) matchingDates.push(e.date); });
        evidence.push({
          criterion: 'Deep Pelvic & Visceral Pain Symptoms',
          sampleCount: bowelOrPelvicPain.length,
          dates: bowelOrPelvicPain.map((e) => e.date).filter(Boolean),
          detail: `Cyclical pelvic cramping or deep visceral discomfort noted on ${bowelOrPelvicPain.length} day(s).`
        });
      }

      // Criterion 4: Functional disability
      const impactedEntries = logEntries.filter((e) => e.functionalImpact === true);
      if (impactedEntries.length > 0) {
        impactedEntries.forEach((e) => { if (e.date) matchingDates.push(e.date); });
        evidence.push({
          criterion: 'Significant Functional Impairment',
          sampleCount: impactedEntries.length,
          dates: impactedEntries.map((e) => e.date).filter(Boolean),
          detail: `Reported disruption to work, school, or daily activity on ${impactedEntries.length} day(s).`
        });
      }

      const uniqueDates = [...new Set(matchingDates)].sort();
      const matched = severePainEntries.length >= 1 || (acyclicPainEntries.length >= 2 && bowelOrPelvicPain.length >= 1);

      return {
        matched,
        severity: severePainEntries.length >= 2 ? 'Strong Pattern' : 'Moderate Pattern',
        sampleSize: uniqueDates.length,
        dateRange: uniqueDates.length > 0 ? { start: uniqueDates[0], end: uniqueDates[uniqueDates.length - 1] } : null,
        evidence,
        suggestedClinicianQuestions: [
          'Could my cyclical pelvic pain and functional interference indicate endometriosis or adenomyosis?',
          'Would a specialized deep-endometriosis pelvic ultrasound mapping scan or MRI be informative?',
          'What medical suppression options or specialist gynecology referrals should we explore?'
        ]
      };
    }
  },
  {
    id: 'pcos_pattern',
    title: 'Irregular Cycle Interval & Androgenic Flare Pattern',
    category: 'Cycle Regularity & Androgens',
    badgeColor: 'sage',
    status: 'Demonstration Pattern (Non-diagnostic)',
    description: 'A pattern marked by extended cycle length (>35 days), delayed ovulation, and outward dermatological features associated with androgenic sensitivity.',
    clinicalRationale:
      'Under the international Rotterdam consensus guidelines, PCOS is evaluated based on ovulatory dysfunction (oligomenorrhea/amenorrhea), clinical or biochemical hyperandrogenism, and polycystic ovarian morphology.',
    literatureBasis:
      'International Evidence-based Guideline for PCOS Assessment and Management (2023 Update); Rotterdam Consensus.',
    evaluate: (logs = {}, profile = {}) => {
      const logEntries = Object.values(logs);
      const evidence = [];
      const matchingDates = [];

      const isLongCycle = (Number(profile?.typicalCycleLength) || 28) > 35 || (Number(profile?.currentCycleDay) || 1) > 35;
      if (isLongCycle) {
        evidence.push({
          criterion: 'Extended or Oligomenorrheic Cycle Length (>35 days)',
          sampleCount: 1,
          dates: [],
          detail: `Cycle interval extends beyond 35 days (typical: ${profile?.typicalCycleLength || 35}d). Extended follicular intervals suggest delayed or irregular ovulation.`
        });
      }

      const androgenicEntries = logEntries.filter((e) =>
        (e.symptoms || []).some((s) =>
          typeof s === 'string' && (s.toLowerCase().includes('acne') || s.toLowerCase().includes('hair'))
        )
      );
      if (androgenicEntries.length > 0) {
        androgenicEntries.forEach((e) => { if (e.date) matchingDates.push(e.date); });
        evidence.push({
          criterion: 'Dermatological / Androgenic Observations',
          sampleCount: androgenicEntries.length,
          dates: androgenicEntries.map((e) => e.date).filter(Boolean),
          detail: `Hormonal acne flares, hirsutism, or hair shedding documented on ${androgenicEntries.length} day(s).`
        });
      }

      const uniqueDates = [...new Set(matchingDates)].sort();
      const matched = isLongCycle || androgenicEntries.length >= 2;

      return {
        matched,
        severity: isLongCycle && androgenicEntries.length >= 2 ? 'Strong Pattern' : 'Moderate Pattern',
        sampleSize: uniqueDates.length,
        dateRange: uniqueDates.length > 0 ? { start: uniqueDates[0], end: uniqueDates[uniqueDates.length - 1] } : null,
        evidence,
        suggestedClinicianQuestions: [
          'Given my cycle variability and androgenic symptoms, should we evaluate hormone levels (free testosterone, LH/FSH, DHEA-S)?',
          'Would checking fasting insulin, HOMA-IR, or a pelvic ultrasound be appropriate?',
          'What lifestyle or medical strategies support ovulatory regularity?'
        ]
      };
    }
  },
  {
    id: 'anaemia_pattern',
    title: 'Heavy Menstrual Bleeding & Fatigue Co-occurrence',
    category: 'Menorrhagia & Ferritin',
    badgeColor: 'terracotta',
    status: 'Demonstration Pattern (Non-diagnostic)',
    description: 'Multiple days of heavy menstrual bleeding temporally associated with pronounced fatigue, dizziness, and cognitive exhaustion.',
    clinicalRationale:
      'ACOG and FIGO classify Heavy Menstrual Bleeding (menorrhagia) as blood loss that impairs physical or quality-of-life parameters. It represents the primary cause of iron deficiency anemia in menstruating women.',
    literatureBasis:
      'FIGO Menstrual Disorders Committee (FIGO AUB guidelines); ACOG Practice Bulletin No. 128: Diagnosis of Abnormal Uterine Bleeding.',
    evaluate: (logs = {}) => {
      const logEntries = Object.values(logs);
      const evidence = [];
      const matchingDates = [];

      const heavyEntries = logEntries.filter((e) => e.bleeding === 'Heavy');
      if (heavyEntries.length > 0) {
        heavyEntries.forEach((e) => { if (e.date) matchingDates.push(e.date); });
        evidence.push({
          criterion: 'Heavy Menstrual Flow (Flooding / Clots)',
          sampleCount: heavyEntries.length,
          dates: heavyEntries.map((e) => e.date).filter(Boolean),
          detail: `Heavy flow logged on ${heavyEntries.length} day(s). Frequent protection changes indicate elevated blood loss.`
        });
      }

      const lowEnergyEntries = logEntries.filter((e) => Number(e.energyRating) <= 2 && e.energyRating !== undefined);
      if (lowEnergyEntries.length > 0) {
        lowEnergyEntries.forEach((e) => { if (e.date) matchingDates.push(e.date); });
        evidence.push({
          criterion: 'Pronounced Low Stamina / Fatigue',
          sampleCount: lowEnergyEntries.length,
          dates: lowEnergyEntries.map((e) => e.date).filter(Boolean),
          detail: `Energy rated 1 or 2 out of 5 across ${lowEnergyEntries.length} day(s), coinciding with bleeding.`
        });
      }

      const uniqueDates = [...new Set(matchingDates)].sort();
      const matched = heavyEntries.length >= 2 || (heavyEntries.length >= 1 && lowEnergyEntries.length >= 2);

      return {
        matched,
        severity: heavyEntries.length >= 3 ? 'Strong Pattern' : 'Moderate Pattern',
        sampleSize: uniqueDates.length,
        dateRange: uniqueDates.length > 0 ? { start: uniqueDates[0], end: uniqueDates[uniqueDates.length - 1] } : null,
        evidence,
        suggestedClinicianQuestions: [
          'Given consecutive heavy flow days and fatigue, could we check a Complete Blood Count (CBC) and serum ferritin?',
          'What medical strategies can help reduce heavy flow volume?'
        ]
      };
    }
  }
];

export function evaluateClinicalPatterns(logs = {}, profile = {}) {
  return CLINICAL_RULES.map((rule) => {
    const result = rule.evaluate(logs, profile);
    return {
      id: rule.id,
      title: rule.title,
      category: rule.category,
      badgeColor: rule.badgeColor,
      status: rule.status,
      description: rule.description,
      clinicalRationale: rule.clinicalRationale,
      literatureBasis: rule.literatureBasis,
      ...result
    };
  });
}
