import { UserProfile } from './sessionStore';

function addRedFlag(profile: UserProfile, flag: string): void {
  if (!profile.red_flags.includes(flag)) {
    profile.red_flags.push(flag);
  }
}

export function inferLightProfile(userText: string, profile: UserProfile): void {
  const text = userText.toLowerCase();

  // Pregnancy detection
  if (/mew[eɛ] nyins[eɛ]n|pregnant|nyins[eɛ]n|mey[eɛ] pregnant/.test(text)) {
    profile.pregnancy_status = 'pregnant';
  }

  // Postpartum detection
  if (/mawo|mewoe|i gave birth|delivered|postpartum|after delivery/.test(text)) {
    profile.postpartum_status = 'postpartum';
    profile.pregnancy_status = 'not_pregnant';
  }

  if (/breastfeed|breastfeeding|me ma abofra no nufo[oɔ]|me ma baby no nufo[oɔ]|nursing/.test(text)) {
    profile.breastfeeding_status = 'breastfeeding';
  }

  if (/not breastfeeding|stopped breastfeeding|me mma abofra no nufo[oɔ] bio/.test(text)) {
    profile.breastfeeding_status = 'not_breastfeeding';
  }

  // Gestational age — months
  const monthMatch = text.match(/(?:bosome|months?)\s*(\d{1,2})|(\d{1,2})\s*(?:months?|bosome)/);
  if (monthMatch) {
    const val = monthMatch[1] || monthMatch[2];
    if (val) profile.gestational_age = `${val} months`;
  }

  // Gestational age — weeks
  const weekMatch = text.match(/(?:weeks?|nnaw[eɛ]twe)\s*(\d{1,2})|(\d{1,2})\s*(?:weeks?|nnaw[eɛ]twe)/);
  if (weekMatch) {
    const val = weekMatch[1] || weekMatch[2];
    if (val) profile.gestational_age = `${val} weeks`;
  }

  // Main concern — set once from first message
  if (!profile.main_concern) {
    profile.main_concern = userText.slice(0, 160);
  }

  // Always update latest
  profile.latest_update = userText.slice(0, 220);

  // Red flags
  if (/abofra no nkeka|baby not moving|movement|nkeka s[eɛ] kan no|reduced.*movement/.test(text)) {
    addRedFlag(profile, 'reduced_fetal_movement');
  }
  if (/mogya|bleeding|blood/.test(text)) {
    addRedFlag(profile, 'bleeding');
  }
  if (/hom[e ]+y[eɛ] den|ahomegye|breathing difficulty|breathing|chest/.test(text)) {
    addRedFlag(profile, 'breathing_difficulty');
  }
  if (/ti y[eɛ] me ya|ani so y[eɛ] me ya|headache|blurred vision|ani so/.test(text)) {
    addRedFlag(profile, 'headache_or_visual_symptom');
  }
  if (/seizure|convulsion|fit|tw[eɛ]tw[eɛ]/.test(text)) {
    addRedFlag(profile, 'seizures');
  }
  if (/faint|collapse|at[uo] agu/.test(text)) {
    addRedFlag(profile, 'fainting');
  }
}
