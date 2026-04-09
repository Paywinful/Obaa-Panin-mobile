import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings';

export function AppHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.flower}>🌸</Text>
        <Text style={styles.appName}>{Strings.appName}</Text>
        <Text style={styles.flower}>🌸</Text>
      </View>
      <Text style={styles.tagline}>{Strings.tagline}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flower: {
    fontSize: 18,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  tagline: {
    fontSize: 11,
    color: Colors.primaryLight,
    letterSpacing: 3,
    marginTop: 2,
    fontWeight: '600',
  },
});
