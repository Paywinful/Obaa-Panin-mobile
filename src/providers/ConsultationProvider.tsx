import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageCode, PregnancyProfile } from '../types';
import { syncPregnancyProfile } from '../services/pregnancyProfileApi';

const LANGUAGE_KEY = 'obaapayin_language';
const SESSION_ID_KEY = 'obaapayin_session_id';
const PREGNANCY_PROFILE_KEY = 'obaapayin_pregnancy_profile';

interface ConsultationContextValue {
  isReady: boolean;
  language: LanguageCode;
  sessionId: string;
  intakeComplete: boolean;
  pregnancyProfile: PregnancyProfile | null;
  setLanguage: (language: LanguageCode) => Promise<void>;
  completeIntake: (profile: PregnancyProfile) => Promise<void>;
  resetIntake: () => Promise<void>;
  refreshSession: () => Promise<string>;
}

const ConsultationContext = createContext<ConsultationContextValue | null>(null);

function createSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ConsultationProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [language, setLanguageState] = useState<LanguageCode>('twi');
  const [sessionId, setSessionId] = useState<string>('default');
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [pregnancyProfile, setPregnancyProfile] = useState<PregnancyProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [storedLanguage, storedSessionId, storedProfile] = await Promise.all([
          AsyncStorage.getItem(LANGUAGE_KEY),
          AsyncStorage.getItem(SESSION_ID_KEY),
          AsyncStorage.getItem(PREGNANCY_PROFILE_KEY),
        ]);

        if (!isMounted) return;

        if (storedLanguage === 'en' || storedLanguage === 'twi') {
          setLanguageState(storedLanguage);
        }

        if (storedSessionId) {
          setSessionId(storedSessionId);
        } else {
          const nextSessionId = createSessionId();
          await AsyncStorage.setItem(SESSION_ID_KEY, nextSessionId);
          if (isMounted) {
            setSessionId(nextSessionId);
          }
        }

        if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile) as PregnancyProfile;
          setPregnancyProfile(parsedProfile);
          setIntakeComplete(true);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage);
  }, []);

  const completeIntake = useCallback(async (profile: PregnancyProfile) => {
    setPregnancyProfile(profile);
    setIntakeComplete(true);
    await AsyncStorage.setItem(PREGNANCY_PROFILE_KEY, JSON.stringify(profile));
  }, []);

  const resetIntake = useCallback(async () => {
    setPregnancyProfile(null);
    setIntakeComplete(false);
    await AsyncStorage.removeItem(PREGNANCY_PROFILE_KEY);
  }, []);

  const refreshSession = useCallback(async () => {
    const nextSessionId = createSessionId();
    setSessionId(nextSessionId);
    await AsyncStorage.setItem(SESSION_ID_KEY, nextSessionId);
    return nextSessionId;
  }, []);

  useEffect(() => {
    if (!isReady || !pregnancyProfile || !sessionId) {
      return;
    }

    syncPregnancyProfile(sessionId, pregnancyProfile).catch((error) => {
      console.error('Pregnancy profile sync failed:', error);
    });
  }, [isReady, pregnancyProfile, sessionId]);

  const value = useMemo<ConsultationContextValue>(() => ({
    isReady,
    language,
    sessionId,
    intakeComplete,
    pregnancyProfile,
    setLanguage,
    completeIntake,
    resetIntake,
    refreshSession,
  }), [
    completeIntake,
    intakeComplete,
    isReady,
    language,
    pregnancyProfile,
    refreshSession,
    resetIntake,
    sessionId,
    setLanguage,
  ]);

  return (
    <ConsultationContext.Provider value={value}>
      {children}
    </ConsultationContext.Provider>
  );
}

export function useConsultationContext(): ConsultationContextValue {
  const context = useContext(ConsultationContext);

  if (!context) {
    throw new Error('useConsultationContext must be used within ConsultationProvider');
  }

  return context;
}
