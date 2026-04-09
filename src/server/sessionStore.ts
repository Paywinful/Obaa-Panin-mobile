export interface UserProfile {
  pregnancy_status: string;
  gestational_age: string | null;
  postpartum_status: string;
  postpartum_duration: string | null;
  breastfeeding_status: string;
  main_concern: string | null;
  latest_update: string | null;
  last_medicine_discussed: string | null;
  last_action: string;
  last_advice: string | null;
  red_flags: string[];
  open_question: string | null;
  user_turn_count: number;
}

export interface SessionMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Session {
  profile: UserProfile;
  clinical_summary: string;
  messages: SessionMessage[];
}

function createDefaultProfile(): UserProfile {
  return {
    pregnancy_status: 'unknown',
    gestational_age: null,
    postpartum_status: 'unknown',
    postpartum_duration: null,
    breastfeeding_status: 'unknown',
    main_concern: null,
    latest_update: null,
    last_medicine_discussed: null,
    last_action: 'probe',
    last_advice: null,
    red_flags: [],
    open_question: null,
    user_turn_count: 0,
  };
}

const sessions = new Map<string, Session>();

export function getSession(id: string = 'default'): Session {
  let session = sessions.get(id);
  if (!session) {
    session = {
      profile: createDefaultProfile(),
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
