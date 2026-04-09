import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISCLAIMER_KEY = 'obaapayin_disclaimer_acknowledged';

interface UseDisclaimerReturn {
  hasSeenDisclaimer: boolean;
  isLoading: boolean;
  acknowledgeDisclaimer: () => Promise<void>;
}

export function useDisclaimer(): UseDisclaimerReturn {
  const [hasSeenDisclaimer, setHasSeenDisclaimer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(DISCLAIMER_KEY).then((value) => {
      setHasSeenDisclaimer(value === 'true');
      setIsLoading(false);
    });
  }, []);

  const acknowledgeDisclaimer = useCallback(async () => {
    await AsyncStorage.setItem(DISCLAIMER_KEY, 'true');
    setHasSeenDisclaimer(true);
  }, []);

  return { hasSeenDisclaimer, isLoading, acknowledgeDisclaimer };
}
