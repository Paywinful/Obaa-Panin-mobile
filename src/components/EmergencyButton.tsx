import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { triggerEmergencyCall } from '../services/emergency';

export function EmergencyButton() {
  const handlePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    triggerEmergencyCall();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
      onPress={handlePress}
      accessibilityLabel="Emergency call"
      accessibilityRole="button"
    >
      <Text style={styles.icon}>📞</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(220,38,38,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: 'rgba(220,38,38,0.3)',
  },
  icon: {
    fontSize: 16,
  },
});
