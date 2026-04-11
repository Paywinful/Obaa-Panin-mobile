import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings';
import { Typography } from '../constants/typography';
import { AppPhase } from '../types';

interface StatusIndicatorProps {
  phase: AppPhase;
  transcript?: string;
}

export function StatusIndicator({ phase, transcript }: StatusIndicatorProps) {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    if (phase === 'listening' || phase === 'processing') {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
        false,
      );
    } else {
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [phase, opacity]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const statusText =
    phase === 'listening'
      ? Strings.listening
      : phase === 'processing'
        ? Strings.thinking
        : phase === 'speaking'
          ? Strings.speaking
          : Strings.readyToListen;

  const dotColor =
    phase === 'listening'
      ? Colors.listening
      : phase === 'processing'
        ? Colors.processing
        : Colors.primary;

  return (
    <View style={styles.container}>
      {phase === 'listening' && transcript ? (
        <Animated.Text style={styles.transcript} numberOfLines={2}>
          {transcript}
        </Animated.Text>
      ) : null}
      <View style={styles.pill}>
        <Animated.View style={[styles.dot, { backgroundColor: dotColor }, dotAnimatedStyle]} />
        <Animated.Text style={[styles.status, { color: Colors.text }]}>
          {statusText}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.statusPill,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  status: {
    ...Typography.body,
    fontWeight: '600',
  },
  transcript: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 6,
  },
});
