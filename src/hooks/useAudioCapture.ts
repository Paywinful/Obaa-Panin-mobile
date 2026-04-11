import { useCallback, useEffect, useState } from 'react';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { Platform } from 'react-native';

export interface RecordedAudio {
  uri: string;
  mimeType: string;
  fileName: string;
}

interface UseAudioCaptureReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordedAudio>;
}

export function useAudioCapture(): UseAudioCaptureReturn {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) {
      throw new Error('Microphone permission denied');
    }

    await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<RecordedAudio> => {
    if (!isRecording) {
      throw new Error('Recording has not started');
    }

    await recorder.stop();
    await AudioModule.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    setIsRecording(false);

    const uri = recorder.uri;
    if (!uri) {
      throw new Error('No audio recorded');
    }

    return {
      uri,
      mimeType: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
      fileName: 'recording.m4a',
    };
  }, [isRecording, recorder]);

  useEffect(() => {
    return () => {
      if (!isRecording) {
        return;
      }

      recorder.stop().catch(() => undefined);
      AudioModule.setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    };
  }, [isRecording, recorder]);

  return { isRecording, startRecording, stopRecording };
}
