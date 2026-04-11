import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { triggerEmergencyCall } from '../services/emergency';

interface EmergencyButtonProps {
  size?: number;
}

export function EmergencyButton({ size = 44 }: EmergencyButtonProps) {
  const handlePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    triggerEmergencyCall();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.buttonPressed,
      ]}
      onPress={handlePress}
      accessibilityLabel="Emergency call"
      accessibilityRole="button"
    >
      <Feather name="phone-call" size={size * 0.42} color={Colors.emergencyDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(220,38,38,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.18)',
  },
  buttonPressed: {
    backgroundColor: 'rgba(220,38,38,0.3)',
  },
});
