import { useState, useCallback, useRef } from 'react';
import { AudioModule, createAudioPlayer } from 'expo-audio';
import { getApiUrl } from '../utils/getApiUrl';

interface UseTextToSpeechReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isGenerating: boolean;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const playCountRef = useRef(0);

  const speak = useCallback(async (text: string): Promise<void> => {
    const currentPlay = ++playCountRef.current;
    setIsGenerating(true);
    setIsSpeaking(false);

    try {
      // Stop previous player
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.release();
        playerRef.current = null;
      }

      await AudioModule.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

      const response = await fetch(`${getApiUrl()}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('TTS error detail:', response.status, errText);
        throw new Error(`TTS request failed (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const base64 = `data:${data.contentType};base64,${data.audio}`;

      if (currentPlay !== playCountRef.current) return;

      // Create a fresh player for each playback
      const player = createAudioPlayer({ uri: base64 });
      playerRef.current = player;

      setIsGenerating(false);
      setIsSpeaking(true);
      player.play();

      // Wait for playback to finish
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          const checkInterval = setInterval(() => {
            if (currentPlay !== playCountRef.current || !player.playing) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 200);
        }, 500);
      });
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      if (currentPlay === playCountRef.current) {
        setIsGenerating(false);
        setIsSpeaking(false);
      }
    }
  }, []);

  const stop = useCallback(() => {
    playCountRef.current++;
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.release();
      playerRef.current = null;
    }
    setIsGenerating(false);
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, isGenerating };
}
