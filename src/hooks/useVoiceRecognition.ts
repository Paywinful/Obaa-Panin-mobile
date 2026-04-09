import { useState, useCallback } from 'react';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { Platform } from 'react-native';

const ASR_ENDPOINT = 'https://whisper-service-194975005212.europe-west4.run.app/transcribe';

interface UseVoiceRecognitionReturn {
  startListening: () => Promise<void>;
  stopListening: () => Promise<string>;
  isListening: boolean;
  error: string | null;
  isAvailable: boolean;
}

export function useVoiceRecognition(): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startListening = useCallback(async () => {
    setError(null);

    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setError('Microphone permission denied');
        return;
      }
      await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsListening(true);
    } catch (err) {
      setError('Failed to start recording');
      console.error('Recording error:', err);
    }
  }, [recorder]);

  const stopListening = useCallback(async (): Promise<string> => {
    setIsListening(false);

    try {
      await recorder.stop();
      await AudioModule.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;

      if (!uri) {
        setError('No audio recorded');
        return '';
      }

      // Send directly to ASR service
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
        name: 'recording.m4a',
      } as any);
      formData.append('language', 'akan');
      formData.append('isImpaired', 'false');

      console.log('Sending to ASR...');
      const response = await fetch(ASR_ENDPOINT, {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      console.log('ASR status:', response.status, 'response:', responseText);

      if (!response.ok) {
        setError('Transcription failed');
        return '';
      }

      const data = JSON.parse(responseText);
      return data.text || data.transcription || '';
    } catch (err) {
      setError('Failed to process audio');
      console.error('Transcription error:', err);
      return '';
    }
  }, [recorder]);

  return {
    startListening,
    stopListening,
    isListening,
    error,
    isAvailable: true,
  };
}
