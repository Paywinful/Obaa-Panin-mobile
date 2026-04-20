import { ActiveCaseState, ClinicalAction, PatientProfile, UserTurnKind } from '../types';

const SYMPTOM_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'headache', pattern: /headache|ti y[ɛe] me ya|ti pa/i },
  { label: 'bleeding', pattern: /bleeding|mogya|blood/i },
  { label: 'abdominal pain', pattern: /abdominal pain|stomach pain|yam? ya|pain/i },
  { label: 'reduced baby movement', pattern: /baby.*not moving|abofra.*nkeka|reduced.*movement/i },
  { label: 'difficulty breathing', pattern: /breathing|ahomegye|home y[ɛe] den/i },
  { label: 'fever', pattern: /fever|hot body|body hot/i },
  { label: 'vomiting', pattern: /vomit|throwing up|foro/i },
  { label: 'weakness', pattern: /weak|br[ɛe]|tired/i },
  { label: 'dizziness', pattern: /dizz|faint|at[oɔ] agu/i },
];

const DANGER_SIGN_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'bleeding in pregnancy', pattern: /bleeding|mogya|blood/i },
  { label: 'severe abdominal pain', pattern: /severe pain|pain too much|yam? ya paa/i },
  { label: 'reduced baby movement', pattern: /baby.*not moving|abofra.*nkeka|reduced.*movement/i },
  { label: 'convulsions', pattern: /convulsion|seizure|fit/i },
  { label: 'difficulty breathing', pattern: /breathing|ahomegye|home y[ɛe] den/i },
  { label: 'severe headache with blurred vision', pattern: /headache.*blur|blurred vision|ani so/i },
  { label: 'fainting', pattern: /faint|collapse|at[oɔ] agu/i },
  { label: 'heavy bleeding after delivery', pattern: /heavy bleeding.*delivery|mogya.*mawo/i },
  { label: 'fever with serious weakness after delivery', pattern: /fever.*weak|hot body.*weak/i },
];

function pushUnique(values: string[] | undefined, value: string): string[] {
  const next = values ? [...values] : [];
  if (!next.includes(value)) {
    next.push(value);
  }
  return next;
}

export function detectMainSymptom(userText: string): string | undefined {
  const match = SYMPTOM_PATTERNS.find((entry) => entry.pattern.test(userText));
  return match?.label;
}

function resetForNewConcern(activeCase: ActiveCaseState, mainSymptom: string): void {
  activeCase.mainSymptom = mainSymptom;
  activeCase.symptomsStillActive = [mainSymptom];
  activeCase.dangerSignsKnown = [];
  activeCase.adviceAlreadyGiven = [];
  activeCase.probeTurnsUsed = 0;
  activeCase.triageLevel = 'probe';
  activeCase.onset = undefined;
  activeCase.severity = undefined;
}

function detectDangerSigns(userText: string): string[] {
  return DANGER_SIGN_PATTERNS.filter((entry) => entry.pattern.test(userText)).map((entry) => entry.label);
}

function detectSeverity(userText: string): string | undefined {
  if (/severe|paa|very bad|too much/i.test(userText)) return 'severe';
  if (/mild|kakra|small/i.test(userText)) return 'mild';
  if (/moderate|middle/i.test(userText)) return 'moderate';
  return undefined;
}

function detectOnset(userText: string): string | undefined {
  if (/today|an[oɔ]pa yi|nn[ɛɛ] yi/i.test(userText)) return 'today';
  if (/yesterday|ennora/i.test(userText)) return 'yesterday';
  if (/for \d+ days|\d+ days|nnansa|days/i.test(userText)) return 'days';
  if (/for \d+ weeks|\d+ weeks|nnaw[oɔ]twe/i.test(userText)) return 'weeks';
  return undefined;
}

function inferPregnancyWeeksFromMonth(selectedMonth: number, answeredAt: number): number {
  const monthToWeek: Record<number, number> = {
    1: 2,
    2: 6,
    3: 11,
    4: 15,
    5: 20,
    6: 25,
    7: 29,
    8: 33,
    9: 38,
  };

  const base = monthToWeek[selectedMonth] ?? 2;
  const elapsedWeeks = Math.max(0, Math.floor((Date.now() - answeredAt) / (7 * 24 * 60 * 60 * 1000)));
  return base + elapsedWeeks;
}

export function applyPregnancyProfileToPatientProfile(
  patientProfile: PatientProfile,
  isPregnant: boolean,
  selectedMonth: number | null,
  answeredAt: number,
): void {
  patientProfile.isPregnant = isPregnant;
  patientProfile.pregnancyAnsweredAt = answeredAt;
  patientProfile.pregnancySelectedMonth = selectedMonth;
  patientProfile.isPostpartum = isPregnant ? false : patientProfile.isPostpartum;
  patientProfile.gestationalWeeks =
    isPregnant && selectedMonth ? inferPregnancyWeeksFromMonth(selectedMonth, answeredAt) : null;
}

export function inferPatientProfile(userText: string, patientProfile: PatientProfile): void {
  const text = userText.toLowerCase();

  if (/mawo|mewoe|i gave birth|delivered|postpartum|after delivery/.test(text)) {
    patientProfile.isPostpartum = true;
    patientProfile.isPregnant = false;
  }

  if (/pregnant|nyins[ɛe]n/.test(text) && patientProfile.isPregnant == null) {
    patientProfile.isPregnant = true;
  }

  if (/breastfeed|breastfeeding|nufo[oɔ]/.test(text)) {
    patientProfile.isBreastfeeding = true;
  }

  if (/not breastfeeding|stopped breastfeeding/.test(text)) {
    patientProfile.isBreastfeeding = false;
  }
}

export function inferActiveCase(
  userText: string,
  activeCase: ActiveCaseState,
  turnKind: UserTurnKind = 'continuation',
): void {
  if (activeCase.pendingPreviousProblemCheck && activeCase.previousProblemFollowUpAsked) {
    const queuedConcern = activeCase.queuedConcern;
    const queuedConcernSymptom = activeCase.queuedConcernSymptom;

    activeCase.pendingPreviousProblemCheck = false;
    activeCase.previousProblemFollowUpAsked = false;
    activeCase.previousProblemSymptom = undefined;
    activeCase.queuedConcern = undefined;
    activeCase.queuedConcernSymptom = undefined;
    activeCase.queuedConcernToAddress = queuedConcern;

    if (queuedConcernSymptom) {
      resetForNewConcern(activeCase, queuedConcernSymptom);

      const queuedDangerSigns = detectDangerSigns(queuedConcern || '');
      const queuedSeverity = detectSeverity(queuedConcern || '');
      const queuedOnset = detectOnset(queuedConcern || '');

      for (const dangerSign of queuedDangerSigns) {
        activeCase.dangerSignsKnown = pushUnique(activeCase.dangerSignsKnown, dangerSign);
      }

      if (queuedSeverity) {
        activeCase.severity = queuedSeverity;
      }

      if (queuedOnset) {
        activeCase.onset = queuedOnset;
      }
    }
  }

  const mainSymptom = detectMainSymptom(userText);
  const dangerSigns = detectDangerSigns(userText);
  const severity = detectSeverity(userText);
  const onset = detectOnset(userText);

  if (turnKind === 'answer') {
    for (const dangerSign of dangerSigns) {
      activeCase.dangerSignsKnown = pushUnique(activeCase.dangerSignsKnown, dangerSign);
    }

    if (severity) {
      activeCase.severity = severity;
    }

    if (onset) {
      activeCase.onset = onset;
    }

    if (mainSymptom && (!activeCase.mainSymptom || mainSymptom === activeCase.mainSymptom)) {
      if (!activeCase.mainSymptom) {
        resetForNewConcern(activeCase, mainSymptom);
      } else {
        activeCase.symptomsStillActive = pushUnique(activeCase.symptomsStillActive, mainSymptom);
      }
    }

    return;
  }

  const shouldCheckPreviousProblemFirst =
    turnKind !== 'continuation' &&
    mainSymptom &&
    activeCase.mainSymptom &&
    mainSymptom !== activeCase.mainSymptom &&
    !activeCase.pendingPreviousProblemCheck &&
    ((activeCase.adviceAlreadyGiven?.length || 0) > 0 || activeCase.probeTurnsUsed > 0);

  if (shouldCheckPreviousProblemFirst) {
    activeCase.pendingPreviousProblemCheck = true;
    activeCase.previousProblemFollowUpAsked = false;
    activeCase.previousProblemSymptom = activeCase.mainSymptom;
    activeCase.queuedConcern = userText;
    activeCase.queuedConcernSymptom = mainSymptom;
    activeCase.queuedConcernToAddress = undefined;
    return;
  }

  if (mainSymptom && mainSymptom !== activeCase.mainSymptom) {
    resetForNewConcern(activeCase, mainSymptom);
  } else if (mainSymptom) {
    activeCase.symptomsStillActive = pushUnique(activeCase.symptomsStillActive, mainSymptom);
  }

  for (const dangerSign of dangerSigns) {
    activeCase.dangerSignsKnown = pushUnique(activeCase.dangerSignsKnown, dangerSign);
  }

  if (severity) {
    activeCase.severity = severity;
  }

  if (onset) {
    activeCase.onset = onset;
  }
}

export function updateCaseAfterAssistantTurn(
  activeCase: ActiveCaseState,
  action: ClinicalAction,
  reply: string,
): void {
  activeCase.triageLevel = action;
  activeCase.lastAssistantQuestion = action === 'probe' ? reply : undefined;

  if (activeCase.pendingPreviousProblemCheck && !activeCase.previousProblemFollowUpAsked && action === 'probe') {
    activeCase.previousProblemFollowUpAsked = true;
    return;
  }

  if (activeCase.queuedConcernToAddress && action !== 'probe') {
    activeCase.queuedConcernToAddress = undefined;
  }

  if (action === 'probe') {
    activeCase.probeTurnsUsed += 1;
    return;
  }

  activeCase.adviceAlreadyGiven = pushUnique(
    activeCase.adviceAlreadyGiven,
    reply.slice(0, 120),
  );
}
