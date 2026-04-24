import { Message, PregnancyProfile } from '../types';

export function getMonthWeekRange(selectedMonth: number): { min: number; max: number | null } {
  const ranges: Record<number, { min: number; max: number | null }> = {
    1: { min: 0, max: 4 },
    2: { min: 5, max: 8 },
    3: { min: 9, max: 13 },
    4: { min: 14, max: 17 },
    5: { min: 18, max: 22 },
    6: { min: 23, max: 27 },
    7: { min: 28, max: 31 },
    8: { min: 32, max: 35 },
    9: { min: 36, max: null },
  };

  return ranges[selectedMonth] || ranges[1];
}

export function formatAnsweredDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function describePregnancyAge(profile: PregnancyProfile): string {
  if (!profile.isPregnant) {
    return 'Not pregnant';
  }

  const selectedMonth = profile.selectedMonth ?? 1;
  const { min, max } = getMonthWeekRange(selectedMonth);
  const elapsedWeeks = Math.max(0, Math.floor((Date.now() - profile.answeredAt) / (7 * 24 * 60 * 60 * 1000)));
  const currentMin = min + elapsedWeeks;
  const currentMax = max === null ? null : max + elapsedWeeks;

  return currentMax === null ? `${currentMin}+ weeks` : `${currentMin}-${currentMax} weeks`;
}

export function buildPregnancyContextMessages(profile: PregnancyProfile | null): Message[] {
  if (!profile) {
    return [];
  }

  const answeredDate = formatAnsweredDate(profile.answeredAt);

  if (!profile.isPregnant) {
    return [
      {
        id: `pregnancy_profile_${profile.answeredAt}`,
        role: 'user',
        content:
          `Pregnancy profile: user said she is not pregnant on ${answeredDate}. ` +
          `Postpartum: ${profile.isPostpartum === true ? 'yes' : profile.isPostpartum === false ? 'no' : 'unknown'}. ` +
          `Breastfeeding: ${profile.isBreastfeeding === true ? 'yes' : profile.isBreastfeeding === false ? 'no' : 'unknown'}.`,
        timestamp: profile.answeredAt,
      },
    ];
  }

  const selectedMonth = profile.selectedMonth ?? 1;
  const ageText = describePregnancyAge(profile);

  return [
    {
      id: `pregnancy_profile_${profile.answeredAt}`,
      role: 'user',
      content:
        `Pregnancy profile: user confirmed pregnancy on ${answeredDate}. ` +
        `At that time she selected Bosome ${selectedMonth}. ` +
        `Estimated current gestational age is about ${ageText}. ` +
        `Breastfeeding: ${profile.isBreastfeeding === true ? 'yes' : profile.isBreastfeeding === false ? 'no' : 'unknown'}.`,
      timestamp: profile.answeredAt,
    },
  ];
}
