import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveCaseState, ClinicalAction, EncounterSummary, PatientProfile } from '../types';

const SESSION_STORAGE_PREFIX = 'obaapayin_clinical_session:';
const MAX_RECENT_ENCOUNTERS = 12;

export interface SessionMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Session {
  patientProfile: PatientProfile;
  activeCase: ActiveCaseState;
  clinical_summary: string;
  messages: SessionMessage[];
  recentEncounters: EncounterSummary[];
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

function createDefaultSession(): Session {
  return {
    patientProfile: createDefaultPatientProfile(),
    activeCase: createDefaultActiveCase(),
    clinical_summary: '',
    messages: [],
    recentEncounters: [],
  };
}

function getStorageKey(id: string): string {
  return `${SESSION_STORAGE_PREFIX}${id || 'default'}`;
}

function sanitizeSession(input: Partial<Session> | null | undefined): Session {
  const defaults = createDefaultSession();

  return {
    patientProfile: {
      ...defaults.patientProfile,
      ...(input?.patientProfile || {}),
    },
    activeCase: {
      ...defaults.activeCase,
      ...(input?.activeCase || {}),
      dangerSignsKnown: Array.isArray(input?.activeCase?.dangerSignsKnown)
        ? input?.activeCase?.dangerSignsKnown
        : defaults.activeCase.dangerSignsKnown,
      symptomsStillActive: Array.isArray(input?.activeCase?.symptomsStillActive)
        ? input?.activeCase?.symptomsStillActive
        : defaults.activeCase.symptomsStillActive,
      adviceAlreadyGiven: Array.isArray(input?.activeCase?.adviceAlreadyGiven)
        ? input?.activeCase?.adviceAlreadyGiven
        : defaults.activeCase.adviceAlreadyGiven,
    },
    clinical_summary: typeof input?.clinical_summary === 'string' ? input.clinical_summary : '',
    messages: Array.isArray(input?.messages)
      ? input.messages.filter(
        (message): message is SessionMessage =>
          Boolean(message) &&
          (message.role === 'user' || message.role === 'model') &&
          typeof message.content === 'string',
      )
      : [],
    recentEncounters: Array.isArray(input?.recentEncounters)
      ? input.recentEncounters
        .filter(
          (summary): summary is EncounterSummary =>
            Boolean(summary) &&
            typeof summary.timestamp === 'number' &&
            typeof summary.adviceGiven === 'string' &&
            typeof summary.triageLevel === 'string',
        )
        .slice(-MAX_RECENT_ENCOUNTERS)
      : [],
  };
}

export async function getSession(id: string = 'default'): Promise<Session> {
  const raw = await AsyncStorage.getItem(getStorageKey(id));
  if (!raw) {
    return createDefaultSession();
  }

  try {
    return sanitizeSession(JSON.parse(raw) as Partial<Session>);
  } catch {
    return createDefaultSession();
  }
}

export async function updateSession(id: string, session: Session): Promise<void> {
  await AsyncStorage.setItem(getStorageKey(id), JSON.stringify(sanitizeSession(session)));
}

export async function clearSession(id: string = 'default'): Promise<void> {
  await AsyncStorage.removeItem(getStorageKey(id));
}

export function resetActiveCase(session: Session): void {
  session.activeCase = createDefaultActiveCase();
}

export function isGuidanceAction(action: ClinicalAction): boolean {
  return action === 'routine' || action === 'urgent' || action === 'emergency';
}
