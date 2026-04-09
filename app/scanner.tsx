import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { AppHeader } from '../src/components/AppHeader';
import { DisclaimerModal } from '../src/components/DisclaimerModal';
import { EmergencyButton } from '../src/components/EmergencyButton';
import { LanguageSelector } from '../src/components/LanguageSelector';
import { Colors } from '../src/constants/colors';
import { Strings } from '../src/constants/strings';
import { useConsultation } from '../src/hooks/useConsultation';
import { useDisclaimer } from '../src/hooks/useDisclaimer';
import { analyzeMedicine } from '../src/services/medicineApi';
import { ClinicalAction, MedicineAnalysisResponse } from '../src/types';

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
  const [contextNote, setContextNote] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MedicineAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { hasSeenDisclaimer, isLoading, acknowledgeDisclaimer } = useDisclaimer();
  const { isReady, language, setLanguage, sessionId } = useConsultation();

  const actionStyle = useMemo(() => getActionStyles(result?.action), [result?.action]);
  const confidenceLabel = useMemo(() => getConfidenceLabel(result?.confidence), [result?.confidence]);

  const handleCamera = useCallback(async () => {
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
  }, []);

  const handleLibrary = useCallback(async () => {
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
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedImage?.base64) {
      setError(Strings.scannerNoImage);
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await analyzeMedicine({
        imageBase64: selectedImage.base64,
        mimeType: selectedImage.mimeType || 'image/jpeg',
        contextNote: contextNote.trim() || undefined,
        language,
        sessionId,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setResult(response);
    } finally {
      setIsAnalyzing(false);
    }
  }, [contextNote, language, selectedImage, sessionId]);

  if (!isReady || isLoading) {
    return null;
  }

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader />

        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Return to voice chat"
          >
            <Text style={styles.backButtonText}>{Strings.scannerBack}</Text>
          </Pressable>
          <EmergencyButton />
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
                  <Text style={styles.emptyPreviewIcon}>💊</Text>
                  <Text style={styles.emptyPreviewTitle}>{Strings.scannerTitle}</Text>
                  <Text style={styles.emptyPreviewText}>{Strings.scannerSubtitle}</Text>
                </View>
              )}
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                onPress={handleCamera}
              >
                <Text style={styles.secondaryButtonText}>{Strings.scannerTakePhoto}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                onPress={handleLibrary}
              >
                <Text style={styles.secondaryButtonText}>{Strings.scannerChoosePhoto}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <LanguageSelector selectedLanguage={language} onSelectLanguage={setLanguage} />

            <Text style={styles.contextLabel}>{Strings.scannerContextLabel}</Text>
            <TextInput
              style={styles.contextInput}
              value={contextNote}
              onChangeText={setContextNote}
              placeholder={Strings.scannerContextPlaceholder}
              placeholderTextColor={Colors.textSecondary}
              multiline
              textAlignVertical="top"
            />

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (!selectedImage || isAnalyzing) && styles.primaryButtonDisabled,
                pressed && selectedImage && !isAnalyzing && styles.buttonPressed,
              ]}
              onPress={handleAnalyze}
              disabled={!selectedImage || isAnalyzing}
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
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
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
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  cardSubheader: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  tipText: {
    marginTop: 6,
    fontSize: 12,
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
  emptyPreviewIcon: {
    fontSize: 34,
    marginBottom: 12,
  },
  emptyPreviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyPreviewText: {
    marginTop: 8,
    fontSize: 13,
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
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Colors.textLight,
    fontSize: 15,
    fontWeight: '700',
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
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.86,
  },
  backButton: {
    backgroundColor: Colors.frostedCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.frostedCardBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonPressed: {
    opacity: 0.86,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  contextLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 2,
  },
  contextInput: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.12)',
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: Colors.text,
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.emergencyDark,
    textAlign: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  resultText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.text,
    marginBottom: 16,
  },
});
