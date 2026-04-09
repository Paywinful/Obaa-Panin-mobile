import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { useRouter } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { Strings } from '../src/constants/strings';
import { getApiUrl } from '../src/utils/getApiUrl';
import { useTextToSpeech } from '../src/hooks/useTextToSpeech';
import { useDisclaimer } from '../src/hooks/useDisclaimer';
import { useConsultation } from '../src/hooks/useConsultation';
import { AppHeader } from '../src/components/AppHeader';
import { GlowingOrb } from '../src/components/GlowingOrb';
import { LanguageSelector } from '../src/components/LanguageSelector';
import { TalkButton } from '../src/components/TalkButton';
import { EmergencyButton } from '../src/components/EmergencyButton';
import { ConversationView } from '../src/components/ConversationView';
import { StatusIndicator } from '../src/components/StatusIndicator';
import { DisclaimerModal } from '../src/components/DisclaimerModal';
import { AppPhase, Message } from '../src/types';

const ASR_ENDPOINT = 'https://whisper-service-194975005212.europe-west4.run.app/transcribe';

let messageIdCounter = 0;
function createMessage(role: 'user' | 'assistant', content: string): Message {
  return {
    id: `msg_${Date.now()}_${++messageIdCounter}`,
    role,
    content,
    timestamp: Date.now(),
  };
}

export default function VoiceChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const { isReady: isConsultationReady, language, setLanguage, sessionId } = useConsultation();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { speak, stop: stopSpeaking, isSpeaking, isGenerating } = useTextToSpeech();
  const { hasSeenDisclaimer, isLoading, acknowledgeDisclaimer } = useDisclaimer();

  // Derive effective phase
  const effectivePhase: AppPhase = isSpeaking ? 'speaking' : isGenerating ? 'processing' : phase;

  const handlePressIn = useCallback(async () => {
    if (isSpeaking || isGenerating) stopSpeaking();
    setError(null);

    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setError(Strings.micPermissionDenied);
        return;
      }
      await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('listening');
    } catch (err) {
      setError(`Record start failed: ${err}`);
      console.error('Recording error:', err);
    }
  }, [isGenerating, isSpeaking, recorder, stopSpeaking]);

  const handlePressOut = useCallback(async () => {
    setPhase('processing');

    try {
      await recorder.stop();
      await AudioModule.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;

      if (!uri) {
        setError('No audio recorded');
        setPhase('idle');
        return;
      }

      // Step 1: ASR — transcribe speech
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
        name: 'recording.m4a',
      } as any);
      formData.append('language', language === 'twi' ? 'akan' : 'en');
      formData.append('isImpaired', 'false');

      const asrResponse = await fetch(ASR_ENDPOINT, { method: 'POST', body: formData });
      const asrText = await asrResponse.text();

      if (!asrResponse.ok) {
        setError(`ASR error: ${asrText}`);
        setPhase('idle');
        return;
      }

      const asrData = JSON.parse(asrText);
      const transcript = asrData.text || asrData.transcription || '';

      if (!transcript) {
        setError(Strings.emptyTranscript);
        setPhase('idle');
        return;
      }

      // Add user message
      const userMsg = createMessage('user', transcript);
      setMessages(prev => [...prev, userMsg]);

      // Step 2: Send to LLM (Gemini handles Twi/English natively)
      const chatRes = await fetch(`${getApiUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: transcript }],
          language,
          sessionId,
        }),
      });
      const chatData = await chatRes.json();

      if (!chatRes.ok) {
        setError(Strings.networkError);
        setPhase('idle');
        return;
      }

      const finalResponse = chatData.content;

      // Add assistant message
      const assistantMsg = createMessage('assistant', finalResponse);
      assistantMsg.action = chatData.action;
      assistantMsg.is_emergency = chatData.is_emergency;
      setMessages(prev => [...prev, assistantMsg]);

      // Step 5: Speak the response
      setPhase('idle');
      try {
        await speak(finalResponse);
      } catch (e) {
        console.error('TTS error:', e);
      }
    } catch (err) {
      setError(Strings.networkError);
      console.error('Error:', err);
      setPhase('idle');
    }
  }, [language, recorder, sessionId, speak]);

  if (isLoading || !isConsultationReady) return null;

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <AppHeader />

        {/* Emergency — subtle top-right */}
        <View style={styles.scannerWrapper}>
          <Pressable
            style={({ pressed }) => [
              styles.scannerButton,
              pressed && styles.scannerButtonPressed,
            ]}
            onPress={() => router.push('/scanner')}
            accessibilityRole="button"
            accessibilityLabel="Open medicine scanner"
          >
            <Text style={styles.scannerButtonText}>{Strings.scannerCta}</Text>
          </Pressable>
        </View>

        <View style={styles.emergencyWrapper}>
          <EmergencyButton />
        </View>

        {/* Conversation card */}
        <View style={styles.conversationArea}>
          <ConversationView messages={messages} />
        </View>

        {/* Error toast */}
        {error && (
          <View style={styles.errorToast}>
            <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
          </View>
        )}

        {/* Orb */}
        <GlowingOrb phase={effectivePhase} />

        {/* Controls */}
        <View style={styles.controls}>
          <StatusIndicator phase={effectivePhase} />
          <LanguageSelector
            selectedLanguage={language}
            onSelectLanguage={setLanguage}
          />
          <TalkButton
            phase={effectivePhase}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          />
        </View>

        {/* Disclaimer */}
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
  emergencyWrapper: {
    position: 'absolute',
    top: 56,
    right: 16,
    zIndex: 10,
  },
  scannerWrapper: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 10,
  },
  scannerButton: {
    backgroundColor: Colors.frostedCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.frostedCardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  scannerButtonPressed: {
    opacity: 0.85,
  },
  scannerButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.4,
  },
  conversationArea: {
    flex: 1,
    maxHeight: '40%',
  },
  errorToast: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: 'rgba(254,226,226,0.9)',
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    textAlign: 'center',
  },
  controls: {
    alignItems: 'center',
    gap: 10,
    paddingBottom: 16,
  },
});
