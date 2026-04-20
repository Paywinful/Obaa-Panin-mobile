import { ActiveCaseState, ClinicalAction, PatientProfile } from '../types';

export interface SessionMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Session {
  patientProfile: PatientProfile;
  activeCase: ActiveCaseState;
  clinical_summary: string;
  messages: SessionMessage[];
}

function createDefaultPatientProfile(): PatientProfile {
  return {
    isPregnant: null,
    pregnancyStartDate: null,
    gestationalWeeks: null,
    isPostpartum: null,
    deliveryDate: null,
    isBreastfeeding: null,
    pregnancyAnsweredAt: null,
    pregnancySelectedMonth: null,
  };
}

function createDefaultActiveCase(): ActiveCaseState {
  return {
    mainSymptom: undefined,
    onset: undefined,
    severity: undefined,
    dangerSignsKnown: [],
    symptomsStillActive: [],
    adviceAlreadyGiven: [],
    probeTurnsUsed: 0,
    triageLevel: 'probe',
    pendingPreviousProblemCheck: false,
    previousProblemSymptom: undefined,
    previousProblemFollowUpAsked: false,
    queuedConcern: undefined,
    queuedConcernSymptom: undefined,
    queuedConcernToAddress: undefined,
    lastAssistantQuestion: undefined,
    latestUserTurnKind: undefined,
    latestUserTurnRaw: undefined,
  };
}

const sessions = new Map<string, Session>();

export function getSession(id: string = 'default'): Session {
  let session = sessions.get(id);
  if (!session) {
    session = {
      patientProfile: createDefaultPatientProfile(),
      activeCase: createDefaultActiveCase(),
      clinical_summary: '',
      messages: [],
    };
    sessions.set(id, session);
  }
  return session;
}

export function updateSession(id: string, session: Session): void {
  sessions.set(id, session);
}

export function clearSession(id: string = 'default'): void {
  sessions.delete(id);
}

export function resetActiveCase(session: Session): void {
  session.activeCase = createDefaultActiveCase();
}

export function isGuidanceAction(action: ClinicalAction): boolean {
  return action === 'routine' || action === 'urgent' || action === 'emergency';
}
