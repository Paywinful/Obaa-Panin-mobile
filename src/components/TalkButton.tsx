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
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings';
import { Typography } from '../constants/typography';
import { AppPhase } from '../types';

interface TalkButtonProps {
  phase: AppPhase;
  onPress: () => void;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TalkButton({ phase, onPress, disabled = false }: TalkButtonProps) {
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

  const isDisabled = disabled || phase === 'processing' || phase === 'speaking';
  const backgroundColor =
    phase === 'listening'
      ? Colors.emergency
      : phase === 'processing'
        ? Colors.processing
        : isDisabled
          ? Colors.primaryLight
          : Colors.primary;

  const handlePress = () => {
    if (isDisabled) return;
    scale.value = withSequence(withTiming(0.92, { duration: 100 }), withTiming(1, { duration: 100 }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {phase === 'listening' && <View style={[styles.pulseRing, { borderColor: Colors.emergency }]} />}
        <AnimatedPressable
          style={[styles.button, { backgroundColor }, animatedStyle]}
          onPress={handlePress}
          disabled={isDisabled}
          accessibilityLabel={phase === 'listening' ? 'Stop recording' : 'Start recording'}
          accessibilityRole="button"
        >
          <MicIcon phase={phase} />
        </AnimatedPressable>
      </View>
      <Text style={styles.hint}>{phase === 'listening' ? Strings.tapToStop : Strings.tapToSpeak}</Text>
    </View>
  );
}

function MicIcon({ phase }: { phase: AppPhase }) {
  const color = Colors.textLight;

  if (phase === 'processing') {
    return <MaterialIcons name="hourglass-top" size={28} color={color} />;
  }

  if (phase === 'speaking') {
    return <MaterialIcons name="volume-up" size={30} color={color} />;
  }

  if (phase === 'listening') {
    return (
      <View style={styles.stopIcon}>
        <View style={styles.stopSquare} />
      </View>
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
  stopIcon: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: Colors.textLight,
  },
  hint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
});
