import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';

export interface PregnancyIntakeOption {
  id: string;
  label: string;
}

interface PregnancyIntakeCardProps {
  question: string;
  helperText: string;
  options: PregnancyIntakeOption[];
  step: number;
  totalSteps: number;
  onSelect: (optionId: string) => void;
  onReplay?: () => void;
}

export function PregnancyIntakeCard({
  question,
  helperText,
  options,
  step,
  totalSteps,
  onSelect,
  onReplay,
}: PregnancyIntakeCardProps) {
  const useCompactOptions = options.length > 4;

  return (
    <View style={styles.card}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.stepRow}>
          <Text style={styles.eyebrow}>Pregnancy Check-In</Text>
          <Text style={styles.stepText}>{step}/{totalSteps}</Text>
        </View>

        <View style={styles.progressTrack}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={index}
              style={[styles.progressDot, index < step ? styles.progressDotActive : null]}
            />
          ))}
        </View>

        <Text style={styles.question}>{question}</Text>
        <Text style={styles.helper}>{helperText}</Text>
        {onReplay ? (
          <View style={styles.questionActions}>
            <Pressable
              style={({ pressed }) => [styles.replayButton, pressed ? styles.replayButtonPressed : null]}
              onPress={onReplay}
              accessibilityRole="button"
              accessibilityLabel="Replay question"
            >
              <MaterialIcons name="play-arrow" size={16} color={Colors.primary} />
              <Text style={styles.replayText}>Replay</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.options, useCompactOptions ? styles.optionsCompact : null]}>
          {options.map((option) => (
            <Pressable
              key={option.id}
              style={({ pressed }) => [
                styles.optionButton,
                useCompactOptions ? styles.optionButtonCompact : null,
                pressed ? styles.optionButtonPressed : null,
              ]}
              onPress={() => onSelect(option.id)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 24,
    backgroundColor: Colors.frostedCard,
    borderWidth: 1,
    borderColor: Colors.frostedCardBorder,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 5,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    ...Typography.label,
    color: Colors.primary,
  },
  stepText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  progressDot: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.surfaceAlt,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  question: {
    ...Typography.title,
    fontSize: 24,
    lineHeight: 32,
    color: Colors.text,
    marginTop: 24,
  },
  helper: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 10,
    lineHeight: 22,
  },
  options: {
    gap: 12,
    marginTop: 24,
  },
  optionsCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  optionButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  optionButtonCompact: {
    width: '48%',
    minHeight: 64,
  },
  optionButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  optionText: {
    ...Typography.bodyStrong,
    fontSize: 16,
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  questionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.frostedCardBorder,
  },
  replayButtonPressed: {
    opacity: 0.8,
  },
  replayText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
});
