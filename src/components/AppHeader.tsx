import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { Strings } from '../constants/strings';
import { Typography } from '../constants/typography';

interface AppHeaderProps {
  compact?: boolean;
}

export function AppHeader({ compact = false }: AppHeaderProps) {
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
    // paddingVertical: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  flower: {
    fontSize: 18,
    color: Colors.primaryLight,
    fontWeight: '700',
  },
  flowerCompact: {
    fontSize: 16,
  },
  appName: {
    ...Typography.hero,
    color: Colors.primary,
  },
  tagline: {
    ...Typography.label,
    color: Colors.primaryLight,
    marginTop: 2,
    opacity: 0.92,
    marginBottom: 6,
  },
});
