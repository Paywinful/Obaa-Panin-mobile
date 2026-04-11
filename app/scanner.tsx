import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../src/components/AppHeader';
import { DisclaimerModal } from '../src/components/DisclaimerModal';
import { EmergencyButton } from '../src/components/EmergencyButton';
import { Colors } from '../src/constants/colors';
import { Strings } from '../src/constants/strings';
import { Typography } from '../src/constants/typography';
import { useAudioCapture } from '../src/hooks/useAudioCapture';
import { useConsultation } from '../src/hooks/useConsultation';
import { useDisclaimer } from '../src/hooks/useDisclaimer';
import { useTextToSpeech } from '../src/hooks/useTextToSpeech';
import { analyzeMedicine } from '../src/services/medicineApi';
import { transcribeAudio } from '../src/services/transcriptionApi';
import { ClinicalAction, MedicineAnalysisResponse } from '../src/types';

let hasPlayedScannerIntroThisLaunch = false;

function getActionStyles(action?: ClinicalAction) {
  switch (action) {
    case 'emergency':
      return { backgroundColor: 'rgba(220,38,38,0.14)', color: Colors.emergencyDark };
    case 'urgent':
      return { backgroundColor: 'rgba(245,158,11,0.18)', color: '#B45309' };
    case 'routine':
      return { backgroundColor: 'rgba(16,185,129,0.14)', color: '#047857' };
    default:
      return { backgroundColor: Colors.statusPill, color: Colors.primary };
  }
}

function getConfidenceLabel(value?: string): string | null {
  if (!value) return null;
  return `${value.charAt(0).toUpperCase()}${value.slice(1)} confidence`;
}

export default function MedicineScannerScreen() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [spokenContext, setSpokenContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isScannerReady, setIsScannerReady] = useState(false);
  const [result, setResult] = useState<MedicineAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { hasSeenDisclaimer, isLoading, acknowledgeDisclaimer } = useDisclaimer();
  const { isReady, language, sessionId } = useConsultation();
  const { isRecording, startRecording, stopRecording } = useAudioCapture();
  const { speak, stop: stopSpeaking, isGenerating, isSpeaking } = useTextToSpeech();

  const actionStyle = useMemo(() => getActionStyles(result?.action), [result?.action]);
  const confidenceLabel = useMemo(() => getConfidenceLabel(result?.confidence), [result?.confidence]);
  const scannerIntro = useMemo(
    () => [Strings.scannerSubtitle, Strings.scannerTip, Strings.scannerImageTip].join('. '),
    [],
  );

  useEffect(() => {
    if (!isReady || isLoading || !hasSeenDisclaimer) {
      return;
    }

    if (hasPlayedScannerIntroThisLaunch) {
      setIsScannerReady(true);
      return;
    }

    hasPlayedScannerIntroThisLaunch = true;
    setIsScannerReady(false);

    let cancelled = false;

    async function playScannerIntro() {
      try {
        await speak(scannerIntro);
      } catch (err) {
        console.error('Scanner intro failed:', err);
      } finally {
        if (!cancelled) {
          setIsScannerReady(true);
        }
      }
    }

    playScannerIntro();

    return () => {
      cancelled = true;
    };
  }, [hasSeenDisclaimer, isLoading, isReady, scannerIntro, speak]);

  const handleCamera = useCallback(async () => {
    if (!isScannerReady) {
      return;
    }

    setError(null);

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError(Strings.scannerCameraPermissionDenied);
      return;
    }

    const response = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: ImagePicker.CameraType.back,
      quality: 0.8,
      base64: true,
    });

    if (!response.canceled) {
      setSelectedImage(response.assets[0]);
      setResult(null);
    }
  }, [isScannerReady]);

  const handleLibrary = useCallback(async () => {
    if (!isScannerReady) {
      return;
    }

    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(Strings.scannerLibraryPermissionDenied);
      return;
    }

    const response = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
      allowsMultipleSelection: false,
    });

    if (!response.canceled) {
      setSelectedImage(response.assets[0]);
      setResult(null);
    }
  }, [isScannerReady]);

  const handleContextRecording = useCallback(async () => {
    if (!isScannerReady) {
      return;
    }

    setError(null);

    if (isRecording) {
      setIsTranscribing(true);

      try {
        const audio = await stopRecording();
        const transcript = (await transcribeAudio(audio, language)).trim();

        if (!transcript) {
          setError(Strings.emptyTranscript);
          return;
        }

        setSpokenContext(transcript);
        setResult(null);
      } catch (err) {
        console.error('Context transcription failed:', err);
        setError(err instanceof Error ? err.message : Strings.networkError);
      } finally {
        setIsTranscribing(false);
      }

      return;
    }

    if (isSpeaking || isGenerating) {
      stopSpeaking();
    }

    try {
      await startRecording();
    } catch (err) {
      console.error('Context recording failed:', err);
      setError(err instanceof Error ? err.message : Strings.micPermissionDenied);
    }
  }, [
    isGenerating,
    isRecording,
    isScannerReady,
    isSpeaking,
    language,
    startRecording,
    stopRecording,
    stopSpeaking,
  ]);

  const handleAnalyze = useCallback(async () => {
    if (!isScannerReady) {
      return;
    }

    if (!selectedImage?.base64) {
      setError(Strings.scannerNoImage);
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    if (isSpeaking || isGenerating) {
      stopSpeaking();
    }

    try {
      const response = await analyzeMedicine({
        imageBase64: selectedImage.base64,
        mimeType: selectedImage.mimeType || 'image/jpeg',
        spokenContext: spokenContext.trim() || undefined,
        language,
        sessionId,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setResult(response);

      if (response.content) {
        await speak(response.content);
      }
    } catch (err) {
      console.error('Medicine analysis failed:', err);
      setError(err instanceof Error ? err.message : Strings.networkError);
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    isGenerating,
    isSpeaking,
    isScannerReady,
    language,
    selectedImage,
    sessionId,
    speak,
    spokenContext,
    stopSpeaking,
  ]);

  if (!isReady || isLoading) {
    return null;
  }

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBlock}>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Return to voice chat"
            >
              <MaterialIcons name="arrow-back" size={18} color={Colors.primary} />
              <Text style={styles.backButtonText}>{Strings.scannerBack}</Text>
            </Pressable>
            <EmergencyButton size={44} />
          </View>
          <AppHeader compact />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardHeader}>{Strings.scannerTitle}</Text>
            <Text style={styles.cardSubheader}>{Strings.scannerSubtitle}</Text>
            <Text style={styles.tipText}>{Strings.scannerTip}</Text>
            <Text style={styles.tipText}>{Strings.scannerImageTip}</Text>

            <View style={styles.previewFrame}>
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.emptyPreview}>
                  <MaterialIcons name="medication" size={34} color={Colors.primary} />
                  <Text style={styles.emptyPreviewTitle}>{Strings.scannerTitle}</Text>
                  <Text style={styles.emptyPreviewText}>{Strings.scannerSubtitle}</Text>
                </View>
              )}
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  !isScannerReady && styles.primaryButtonDisabled,
                  pressed && isScannerReady && styles.buttonPressed,
                ]}
                onPress={handleCamera}
                disabled={!isScannerReady}
              >
                <Text style={styles.secondaryButtonText}>{Strings.scannerTakePhoto}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  !isScannerReady && styles.primaryButtonDisabled,
                  pressed && isScannerReady && styles.buttonPressed,
                ]}
                onPress={handleLibrary}
                disabled={!isScannerReady}
              >
                <Text style={styles.secondaryButtonText}>{Strings.scannerChoosePhoto}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            {/* <LanguageSelector selectedLanguage={language} onSelectLanguage={setLanguage} /> */}

            <Text style={styles.contextLabel}>{Strings.scannerContextLabel}</Text>
            {/* <Text style={styles.contextDescription}>
              {isRecording ? Strings.scannerContextRecording : Strings.scannerContextIdle}
            </Text> */}

            <Pressable
              style={({ pressed }) => [
                styles.recordButton,
                isRecording && styles.recordButtonActive,
                (!isScannerReady || isTranscribing || isAnalyzing) && styles.primaryButtonDisabled,
                pressed && isScannerReady && !isTranscribing && !isAnalyzing && styles.buttonPressed,
              ]}
              onPress={handleContextRecording}
              disabled={!isScannerReady || isTranscribing || isAnalyzing}
            >
              {isTranscribing ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={Colors.textLight} size="small" />
                  <Text style={styles.primaryButtonText}>{Strings.thinking}</Text>
                </View>
              ) : (
                <View style={styles.recordButtonContent}>
                  <MaterialIcons
                    name={isRecording ? 'stop' : 'mic'}
                    size={18}
                    color={Colors.textLight}
                  />
                  <Text style={styles.primaryButtonText}>
                    {spokenContext ? Strings.scannerContextRerecord : Strings.scannerContextAction}
                  </Text>
                </View>
              )}
            </Pressable>

            {spokenContext ? (
              <View style={styles.transcriptCard}>
                <Text style={styles.transcriptLabel}>{Strings.scannerContextTranscript}</Text>
                <Text style={styles.transcriptText}>{spokenContext}</Text>
              </View>
            ) : (
              <Text style={styles.contextHint}>{Strings.scannerContextMissing}</Text>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (!isScannerReady || !selectedImage || isAnalyzing || isRecording || isTranscribing) && styles.primaryButtonDisabled,
                pressed && isScannerReady && selectedImage && !isAnalyzing && !isRecording && !isTranscribing && styles.buttonPressed,
              ]}
              onPress={handleAnalyze}
              disabled={!isScannerReady || !selectedImage || isAnalyzing || isRecording || isTranscribing}
            >
              {isAnalyzing ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={Colors.textLight} size="small" />
                  <Text style={styles.primaryButtonText}>{Strings.scannerAnalyzing}</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>{Strings.scannerAnalyze}</Text>
              )}
            </Pressable>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          {result ? (
            <View style={styles.card}>
              <Text style={styles.cardHeader}>{Strings.scannerResultTitle}</Text>
              <View style={styles.resultMetaRow}>
                {result.identifiedMedicine ? (
                  <View style={styles.resultChip}>
                    <Text style={styles.resultChipText}>{result.identifiedMedicine}</Text>
                  </View>
                ) : null}
                {confidenceLabel ? (
                  <View style={styles.resultChip}>
                    <Text style={styles.resultChipText}>{confidenceLabel}</Text>
                  </View>
                ) : null}
                {result.action ? (
                  <View
                    style={[
                      styles.resultChip,
                      { backgroundColor: actionStyle.backgroundColor },
                    ]}
                  >
                    <Text style={[styles.resultChipText, { color: actionStyle.color }]}>
                      {result.action.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.resultText}>{result.content}</Text>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                onPress={handleCamera}
              >
                <Text style={styles.secondaryButtonText}>{Strings.scannerRetake}</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        <DisclaimerModal
          visible={!hasSeenDisclaimer}
          onAccept={acknowledgeDisclaimer}
        />
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
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.frostedCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.frostedCardBorder,
    padding: 18,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  cardHeader: {
    ...Typography.title,
    color: Colors.primary,
  },
  cardSubheader: {
    ...Typography.body,
    marginTop: 4,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  tipText: {
    ...Typography.caption,
    marginTop: 6,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  previewFrame: {
    marginTop: 18,
    height: 240,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.18)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  emptyPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyPreviewTitle: {
    ...Typography.title,
    marginTop: 12,
    color: Colors.primary,
  },
  emptyPreviewText: {
    ...Typography.body,
    marginTop: 8,
    lineHeight: 19,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonActive: {
    backgroundColor: Colors.emergency,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...Typography.bodyStrong,
    color: Colors.textLight,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.14)',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...Typography.bodyStrong,
    color: Colors.primary,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.frostedCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.frostedCardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonPressed: {
    opacity: 0.86,
  },
  backButtonText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
  contextLabel: {
    ...Typography.title,
    marginBottom: 15,
    color: Colors.primary,
  },
  contextDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  contextHint: {
    ...Typography.caption,
    marginTop: 10,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  transcriptCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.12)',
    backgroundColor: 'rgba(255,255,255,0.75)',
    padding: 14,
  },
  transcriptLabel: {
    ...Typography.label,
    color: Colors.primary,
    marginBottom: 6,
  },
  transcriptText: {
    ...Typography.body,
    color: Colors.text,
    lineHeight: 21,
  },
  errorText: {
    ...Typography.caption,
    marginTop: 12,
    lineHeight: 19,
    color: Colors.emergencyDark,
    textAlign: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  resultChip: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  resultChipText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.primary,
  },
  resultText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.text,
    marginBottom: 16,
    fontWeight: '500',
  },
});
