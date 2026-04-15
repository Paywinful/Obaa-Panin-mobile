import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../src/components/AppHeader';
import { DisclaimerModal } from '../src/components/DisclaimerModal';
import { PregnancyIntakeCard, PregnancyIntakeOption } from '../src/components/PregnancyIntakeCard';
import { Colors } from '../src/constants/colors';
import { Typography } from '../src/constants/typography';
import { useConsultation } from '../src/hooks/useConsultation';
import { useDisclaimer } from '../src/hooks/useDisclaimer';
import { syncPregnancyProfile } from '../src/services/pregnancyProfileApi';
import { useTextToSpeech } from '../src/hooks/useTextToSpeech';
import { AppPhase, PregnancyProfile } from '../src/types';

const intakeOptionsByStep: Record<'pregnancy' | 'months', PregnancyIntakeOption[]> = {
  pregnancy: [
    { id: 'yes', label: 'Aane' },
    { id: 'no', label: 'Daabi' },
  ],
  months: Array.from({ length: 9 }, (_, index) => ({
    id: `month_${index + 1}`,
    label: `Bosome ${index + 1}`,
  })),
};

type IntakeStep = 'pregnancy' | 'months';

export default function IntakeScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const router = useRouter();
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [intakeStep, setIntakeStep] = useState<IntakeStep>('pregnancy');
  const {
    isReady,
    intakeComplete,
    completeIntake,
    refreshSession,
    pregnancyProfile,
  } = useConsultation();
  const { speak, stop: stopSpeaking, isSpeaking, isGenerating } = useTextToSpeech();
  const { hasSeenDisclaimer, isLoading, acknowledgeDisclaimer } = useDisclaimer();
  const hasSpokenCurrentQuestionRef = useRef(false);
  const isEditMode = params.mode === 'edit';

  const effectivePhase: AppPhase = isSpeaking ? 'speaking' : isGenerating ? 'processing' : phase;
  const currentQuestion =
    intakeStep === 'pregnancy' ? 'Woyem anaa?' : 'Woanyinsɛn no adi bosome ahe?';
  const currentPrompt = useMemo(
    () =>
      intakeStep === 'pregnancy'
        ? 'Woyem anaa? Woyem meaa, aane. Wonnyem meaa, daabi.'
        : 'Woanyinsɛn no adi bosome ahe?',
    [intakeStep],
  );

  useEffect(() => {
    hasSpokenCurrentQuestionRef.current = false;
  }, [intakeStep]);

  useEffect(() => {
    if (isLoading || !isReady || !hasSeenDisclaimer || hasSpokenCurrentQuestionRef.current) {
      return;
    }

    hasSpokenCurrentQuestionRef.current = true;

    async function playQuestion() {
      try {
        await speak(currentPrompt);
      } catch (err) {
        console.error('Intake opening failed:', err);
      } finally {
        setPhase('idle');
      }
    }

    playQuestion();
  }, [currentPrompt, hasSeenDisclaimer, isLoading, isReady, speak]);

  useEffect(() => () => {
    stopSpeaking();
  }, [stopSpeaking]);

  useEffect(() => {
    if (!isReady || !intakeComplete || isEditMode) {
      return;
    }

    router.replace('/');
  }, [intakeComplete, isEditMode, isReady, router]);

  const replayCurrentQuestion = useCallback(async () => {
    stopSpeaking();
    await speak(currentPrompt);
    setPhase('idle');
  }, [currentPrompt, speak, stopSpeaking]);

  const finishIntake = useCallback(async (profile: PregnancyProfile) => {
    stopSpeaking();
    const nextSessionId = await refreshSession();
    await completeIntake(profile);
    await syncPregnancyProfile(nextSessionId, profile);
    router.replace('/');
  }, [completeIntake, refreshSession, router, stopSpeaking]);

  const handleSelection = useCallback(async (optionId: string) => {
    stopSpeaking();
    setError(null);

    if (intakeStep === 'pregnancy') {
      if (optionId === 'yes') {
        setIntakeStep('months');
        return;
      }

      await finishIntake({
        isPregnant: false,
        selectedMonth: null,
        answeredAt: Date.now(),
      });
      return;
    }

    const selectedMonth = Number(optionId.replace('month_', ''));
    if (!Number.isFinite(selectedMonth)) {
      return;
    }

    await finishIntake({
      isPregnant: true,
      selectedMonth,
      answeredAt: Date.now(),
    });
  }, [finishIntake, intakeStep, stopSpeaking]);

  if (isLoading || !isReady) {
    return null;
  }

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topSection}>
          <AppHeader compact />
          <Text style={styles.pageTitle}>
            {isEditMode ? 'Edit Pregnancy Answers' : 'Pregnancy Check-In'}
          </Text>
          <Text style={styles.pageSubtitle}>
            {isEditMode
              ? 'Update the stored answers. This will refresh the conversation context.'
              : 'Answer these first, then the main home page opens.'}
          </Text>
          {isEditMode && pregnancyProfile ? (
            <Text style={styles.editHint}>
              Current answer: {pregnancyProfile.isPregnant ? `Bosome ${pregnancyProfile.selectedMonth}` : 'Daabi'}
            </Text>
          ) : null}
        </View>

        <View style={styles.cardArea}>
          <PregnancyIntakeCard
            question={currentQuestion}
            helperText={
              intakeStep === 'pregnancy'
                ? 'Paw mmuae baako na toa so.'
                : 'Paw bosome a ɛne nyinsɛn no hyia.'
            }
            options={intakeOptionsByStep[intakeStep]}
            step={intakeStep === 'pregnancy' ? 1 : 2}
            totalSteps={2}
            onSelect={handleSelection}
            onReplay={replayCurrentQuestion}
          />
        </View>

        {error ? (
          <View style={styles.errorToast}>
            <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {effectivePhase === 'speaking' || effectivePhase === 'processing'
              ? 'Question is being read aloud.'
              : 'Select one option to continue.'}
          </Text>
        </View>

        <DisclaimerModal visible={!hasSeenDisclaimer} onAccept={acknowledgeDisclaimer} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  pageTitle: {
    ...Typography.title,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 6,
  },
  pageSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  editHint: {
    ...Typography.caption,
    color: Colors.primaryDark,
    textAlign: 'center',
    marginTop: 8,
  },
  cardArea: {
    flex: 1,
    minHeight: 0,
  },
  errorToast: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: 'rgba(254,226,226,0.9)',
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    ...Typography.caption,
    color: '#991B1B',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 18,
    paddingTop: 8,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
