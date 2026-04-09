import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings';

interface DisclaimerModalProps {
  visible: boolean;
  onAccept: () => void;
}

export function DisclaimerModal({ visible, onAccept }: DisclaimerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>⚕️</Text>
          <Text style={styles.title}>{Strings.disclaimerTitle}</Text>
          <Text style={styles.body}>{Strings.disclaimerText}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={onAccept}
          >
            <Text style={styles.buttonText}>{Strings.disclaimerAccept}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    width: '100%',
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  buttonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },
});
