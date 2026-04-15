import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../src/components/AppHeader';
import { ConversationView } from '../src/components/ConversationView';
import { DisclaimerModal } from '../src/components/DisclaimerModal';
import { EmergencyButton } from '../src/components/EmergencyButton';
import { GlowingOrb } from '../src/components/GlowingOrb';
import { StatusIndicator } from '../src/components/StatusIndicator';
import { TalkButton } from '../src/components/TalkButton';
import { Colors } from '../src/constants/colors';
import { Strings } from '../src/constants/strings';
import { Typography } from '../src/constants/typography';
import { useAudioCapture } from '../src/hooks/useAudioCapture';
import { useConsultation } from '../src/hooks/useConsultation';
import { useDisclaimer } from '../src/hooks/useDisclaimer';
import { useTextToSpeech } from '../src/hooks/useTextToSpeech';
import { sendChatMessage } from '../src/services/chatApi';
import { transcribeAudio } from '../src/services/transcriptionApi';
import { AppPhase, Message } from '../src/types';

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
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const {
    isReady: isConsultationReady,
    language,
    sessionId,
    intakeComplete,
    refreshSession,
  } = useConsultation();
  const { isRecording, startRecording, stopRecording } = useAudioCapture();
  const { speak, stop: stopSpeaking, isSpeaking, isGenerating } = useTextToSpeech();
  const { hasSeenDisclaimer, isLoading, acknowledgeDisclaimer } = useDisclaimer();
  const hasPlayedOpeningRef = useRef(false);

  const effectivePhase: AppPhase = isSpeaking ? 'speaking' : isGenerating ? 'processing' : phase;

  const playOpening = useCallback(async () => {
    const openingMessage = createMessage('assistant', Strings.openingGreeting);
    setMessages([openingMessage]);
    setIsMicEnabled(false);

    try {
      await speak(Strings.openingGreeting);
    } catch (err) {
      console.error('Opening greeting failed:', err);
    } finally {
      setPhase('idle');
      setIsMicEnabled(true);
    }
  }, [speak]);

  useEffect(() => {
    if (!isLoading && isConsultationReady && hasSeenDisclaimer && !intakeComplete) {
      router.replace('/intake');
    }
  }, [hasSeenDisclaimer, intakeComplete, isConsultationReady, isLoading, router]);

  useEffect(() => {
    if (
      isLoading ||
      !isConsultationReady ||
      !hasSeenDisclaimer ||
      !intakeComplete ||
      hasPlayedOpeningRef.current
    ) {
      return;
    }

    hasPlayedOpeningRef.current = true;
    let cancelled = false;

    async function startOpening() {
      try {
        const openingMessage = createMessage('assistant', Strings.openingGreeting);
        setMessages([openingMessage]);
        setIsMicEnabled(false);
        await speak(Strings.openingGreeting);
      } catch (err) {
        console.error('Opening greeting failed:', err);
      } finally {
        if (!cancelled) {
          setPhase('idle');
          setIsMicEnabled(true);
        }
      }
    }

    startOpening();

    return () => {
      cancelled = true;
    };
  }, [hasSeenDisclaimer, intakeComplete, isConsultationReady, isLoading, speak]);

  const handleReplayMessage = useCallback(async (text: string) => {
    stopSpeaking();
    await speak(text);
  }, [speak, stopSpeaking]);

  const handleClearConversation = useCallback(async () => {
    stopSpeaking();
    setError(null);
    setMessages([]);
    await refreshSession();
    await playOpening();
  }, [playOpening, refreshSession, stopSpeaking]);

  const handleTalkPress = useCallback(async () => {
    if (!isMicEnabled) {
      return;
    }

    setError(null);

    if (isRecording) {
      setPhase('processing');

      try {
        const audio = await stopRecording();
        const transcript = (await transcribeAudio(audio, language)).trim();

        if (!transcript) {
          setError(Strings.emptyTranscript);
          setPhase('idle');
          return;
        }

        const userMsg = createMessage('user', transcript);
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);

        const chatData = await sendChatMessage(nextMessages, language, sessionId);
        if (chatData.error || !chatData.content) {
          setError(chatData.error || Strings.networkError);
          setPhase('idle');
          return;
        }

        const assistantMsg = createMessage('assistant', chatData.content);
        assistantMsg.action = chatData.action;
        assistantMsg.is_emergency = chatData.is_emergency;
        setMessages((prev) => [...prev, assistantMsg]);

        setPhase('idle');
        await speak(chatData.content);
      } catch (err) {
        console.error('Voice chat error:', err);
        setError(err instanceof Error ? err.message : Strings.networkError);
        setPhase('idle');
      }

      return;
    }

    if (isSpeaking || isGenerating) {
      stopSpeaking();
    }

    try {
      await startRecording();
      setPhase('listening');
    } catch (err) {
      console.error('Recording start failed:', err);
      setError(err instanceof Error ? err.message : Strings.micPermissionDenied);
      setPhase('idle');
    }
  }, [
    isGenerating,
    isMicEnabled,
    isRecording,
    isSpeaking,
    language,
    messages,
    sessionId,
    speak,
    startRecording,
    stopRecording,
    stopSpeaking,
  ]);

  if (isLoading || !isConsultationReady || !intakeComplete) {
    return null;
  }

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topSection}>
          <View style={styles.actionRow}>
            <View style={styles.leftActions}>
              <Pressable
                style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
                onPress={() => router.push('/scanner')}
                accessibilityRole="button"
                accessibilityLabel="Open medicine scanner"
              >
                <MaterialIcons name="photo-camera" size={22} color={Colors.primary} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
                onPress={() => router.push('/pregnancy-profile')}
                accessibilityRole="button"
                accessibilityLabel="Open pregnancy answers"
              >
                <MaterialIcons name="edit-note" size={22} color={Colors.primary} />
              </Pressable>
            </View>
            <EmergencyButton size={48} />
          </View>
          <AppHeader compact />
        </View>

        <View style={styles.conversationArea}>
          <ConversationView
            messages={messages}
            onReplayMessage={handleReplayMessage}
            onClearConversation={handleClearConversation}
          />
        </View>

        {error ? (
          <View style={styles.errorToast}>
            <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
          </View>
        ) : null}

        <GlowingOrb phase={effectivePhase} />

        <View style={styles.controls}>
          <StatusIndicator phase={effectivePhase} />
          <TalkButton
            phase={effectivePhase}
            onPress={handleTalkPress}
            disabled={!isMicEnabled}
          />
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
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.frostedCard,
    borderWidth: 1,
    borderColor: Colors.frostedCardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconButtonPressed: {
    opacity: 0.84,
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
    ...Typography.caption,
    color: '#991B1B',
    textAlign: 'center',
  },
  controls: {
    alignItems: 'center',
    gap: 10,
    paddingBottom: 16,
  },
});
