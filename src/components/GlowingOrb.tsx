import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/colors';
import { AppPhase } from '../types';

interface GlowingOrbProps {
  phase: AppPhase;
}

const ORB_SIZE = 160;
const WAVE_COUNT = 3;

function SoundWave({ delay, active }: { delay: number; active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1.8, duration: 1500, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(opacity, { toValue: 0.4, duration: 300, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
            ]),
          ]),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      scale.setValue(1);
      opacity.setValue(0);
    }
  }, [active, delay, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.wave,
        { opacity, transform: [{ scale }] },
      ]}
    />
  );
}

export function GlowingOrb({ phase }: GlowingOrbProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const toValue = phase === 'listening' ? 1.08 : phase === 'speaking' ? 1.04 : 1.03;
    const duration = phase === 'listening' ? 800 : phase === 'speaking' ? 500 : 2000;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue, duration, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [phase, scaleAnim]);

  const isSpeaking = phase === 'speaking';

  return (
    <View style={styles.container}>
      {/* Sound wave rings */}
      {Array.from({ length: WAVE_COUNT }).map((_, i) => (
        <SoundWave key={i} delay={i * 500} active={isSpeaking} />
      ))}

      {/* Orb */}
      <Animated.View
        style={[styles.outerGlow, { transform: [{ scale: scaleAnim }] }]}
      >
        <View style={styles.midGlow}>
          <View style={styles.innerOrb}>
            <View style={styles.highlight} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: ORB_SIZE + 80,
  },
  wave: {
    position: 'absolute',
    width: ORB_SIZE + 20,
    height: ORB_SIZE + 20,
    borderRadius: (ORB_SIZE + 20) / 2,
    borderWidth: 2.5,
    borderColor: Colors.primaryLight,
  },
  outerGlow: {
    width: ORB_SIZE + 60,
    height: ORB_SIZE + 60,
    borderRadius: (ORB_SIZE + 60) / 2,
    backgroundColor: 'rgba(124,58,237,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  midGlow: {
    width: ORB_SIZE + 20,
    height: ORB_SIZE + 20,
    borderRadius: (ORB_SIZE + 20) / 2,
    backgroundColor: 'rgba(124,58,237,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerOrb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: Colors.orbCore,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
  },
  highlight: {
    width: ORB_SIZE * 0.5,
    height: ORB_SIZE * 0.5,
    borderRadius: (ORB_SIZE * 0.5) / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: -ORB_SIZE * 0.15,
    marginLeft: -ORB_SIZE * 0.05,
  },
});
