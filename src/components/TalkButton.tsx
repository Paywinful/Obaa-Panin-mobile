import React from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings';
import { AppPhase } from '../types';

interface TalkButtonProps {
  phase: AppPhase;
  onPressIn: () => void;
  onPressOut: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TalkButton({ phase, onPressIn, onPressOut }: TalkButtonProps) {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (phase === 'listening') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [phase, pulseScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }));

  const isDisabled = phase === 'processing' || phase === 'speaking';

  const backgroundColor =
    phase === 'listening'
      ? Colors.listening
      : phase === 'processing'
        ? Colors.processing
        : isDisabled
          ? Colors.primaryLight
          : Colors.primary;

  const handlePressIn = () => {
    if (isDisabled) return;
    scale.value = withTiming(0.92, { duration: 100 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPressIn();
  };

  const handlePressOut = () => {
    if (isDisabled) return;
    scale.value = withTiming(1, { duration: 100 });
    onPressOut();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {phase === 'listening' && <View style={[styles.pulseRing, { borderColor: Colors.listening }]} />}
        <AnimatedPressable
          style={[styles.button, { backgroundColor }, animatedStyle]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
          accessibilityLabel="Tap to speak"
          accessibilityRole="button"
        >
          <MicIcon phase={phase} />
        </AnimatedPressable>
      </View>
      <Text style={styles.hint}>{Strings.tapToSpeak}</Text>
    </View>
  );
}

function MicIcon({ phase }: { phase: AppPhase }) {
  const color = Colors.textLight;
  if (phase === 'processing') {
    return (
      <Animated.Text style={[styles.icon, { color }]}>{'⏳'}</Animated.Text>
    );
  }
  if (phase === 'speaking') {
    return (
      <Animated.Text style={[styles.icon, { color }]}>{'🔊'}</Animated.Text>
    );
  }
  return (
    <View style={styles.micContainer}>
      <View style={[styles.micBody, { backgroundColor: color }]} />
      <View style={[styles.micBase, { borderColor: color }]} />
      <View style={[styles.micStand, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 8,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    opacity: 0.3,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  icon: {
    fontSize: 26,
  },
  micContainer: {
    alignItems: 'center',
  },
  micBody: {
    width: 12,
    height: 20,
    borderRadius: 6,
  },
  micBase: {
    width: 22,
    height: 11,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    borderWidth: 2,
    borderTopWidth: 0,
    marginTop: -2,
  },
  micStand: {
    width: 2.5,
    height: 5,
    marginTop: 1,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
});
