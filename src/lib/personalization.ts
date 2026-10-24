import { SUGGESTED_SUBJECTS } from "./labels";
import type { Mode, Profile } from "./types";

/** Default interaction mode derived from the declared preference. */
export function defaultModeFor(profile: Profile | null): Mode {
  if (!profile?.personalizationEnabled) return "mentor";
  switch (profile.interactionPreference) {
    case "exigeant":
      return "sparring";
    case "socratique":
      return "socratic";
    default:
      return profile.learningGoal === "convictions" ? "sparring" : "mentor";
  }
}

/** Editable subject ideas: interest-based ones first, then generic examples. */
export function suggestionsFor(profile: Profile | null, max = 5): string[] {
  const fromInterests = profile?.personalizationEnabled
    ? profile.learningInterests.slice(0, 2).map((i) => `Qu'est-ce qui est souvent mal compris en ${i.toLowerCase()} ?`)
    : [];
  return [...fromInterests, ...SUGGESTED_SUBJECTS].slice(0, max);
}

export function greetingName(profile: Profile | null): string | null {
  return profile?.personalizationEnabled && profile.displayName ? profile.displayName : null;
}
