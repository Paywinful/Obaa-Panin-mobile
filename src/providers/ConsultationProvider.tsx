import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageCode } from '../types';

const LANGUAGE_KEY = 'obaapayin_language';
const SESSION_ID_KEY = 'obaapayin_session_id';

interface ConsultationContextValue {
  isReady: boolean;
  language: LanguageCode;
  sessionId: string;
  setLanguage: (language: LanguageCode) => Promise<void>;
}

const ConsultationContext = createContext<ConsultationContextValue | null>(null);

function createSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ConsultationProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [language, setLanguageState] = useState<LanguageCode>('twi');
  const [sessionId, setSessionId] = useState<string>('default');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [storedLanguage, storedSessionId] = await Promise.all([
          AsyncStorage.getItem(LANGUAGE_KEY),
          AsyncStorage.getItem(SESSION_ID_KEY),
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

  const value = useMemo<ConsultationContextValue>(() => ({
    isReady,
    language,
    sessionId,
    setLanguage,
  }), [isReady, language, sessionId, setLanguage]);

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
