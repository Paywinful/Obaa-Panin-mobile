import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../src/components/AppHeader';
import { Colors } from '../src/constants/colors';
import { Typography } from '../src/constants/typography';
import { useConsultation } from '../src/hooks/useConsultation';
import { describePregnancyAge, formatAnsweredDate } from '../src/utils/pregnancyProfile';

export default function PregnancyProfileScreen() {
  const router = useRouter();
  const { pregnancyProfile } = useConsultation();

  useEffect(() => {
    if (!pregnancyProfile) {
      router.replace('/intake?mode=edit');
    }
  }, [pregnancyProfile, router]);

  if (!pregnancyProfile) {
    return null;
  }

  return (
    <LinearGradient
      colors={[Colors.backgroundGradientStart, Colors.backgroundGradientEnd]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topSection}>
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <MaterialIcons name="arrow-back" size={22} color={Colors.primary} />
            </Pressable>
          </View>
          <AppHeader compact />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Pregnancy Answers</Text>
          <Text style={styles.subtitle}>These are the saved answers used for future conversations.</Text>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Pregnant</Text>
            <Text style={styles.value}>{pregnancyProfile.isPregnant ? 'Aane' : 'Daabi'}</Text>
          </View>

          {pregnancyProfile.isPregnant ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Selected bosome</Text>
                <Text style={styles.value}>Bosome {pregnancyProfile.selectedMonth}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Estimated current age</Text>
                <Text style={styles.value}>{describePregnancyAge(pregnancyProfile)}</Text>
              </View>
            </>
          ) : null}

          <View style={styles.detailRow}>
            <Text style={styles.label}>Answered on</Text>
            <Text style={styles.value}>{formatAnsweredDate(pregnancyProfile.answeredAt)}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={() => router.push('/intake?mode=edit')}
          >
            <Text style={styles.primaryButtonText}>Edit Responses</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.frostedCard,
    borderWidth: 1,
    borderColor: Colors.frostedCardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    opacity: 0.84,
  },
  card: {
    margin: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: Colors.frostedCard,
    borderWidth: 1,
    borderColor: Colors.frostedCardBorder,
  },
  title: {
    ...Typography.title,
    color: Colors.primary,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 18,
  },
  detailRow: {
    marginBottom: 14,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  value: {
    ...Typography.bodyStrong,
    color: Colors.text,
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.84,
  },
  primaryButtonText: {
    ...Typography.bodyStrong,
    color: Colors.textLight,
  },
});
