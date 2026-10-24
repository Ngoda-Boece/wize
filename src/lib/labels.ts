// User-facing French labels for domain values. Kept in one place so a future
// i18n layer only has to replace this module.
import type {
  ExperienceLevel,
  InteractionPreference,
  LearningGoal,
  Mode,
  ObjectiveKind,
  ObjectiveStatus,
} from "./types";

export type ModeInfo = {
  id: Mode;
  label: string;
  tagline: string;
  description: string;
  opening: string;
};

export const MODE_INFO: Record<Mode, ModeInfo> = {
  sparring: {
    id: "sparring",
    label: "Sparring",
    tagline: "Teste la solidité de tes idées",
    description:
      "Wize identifie ta thèse, questionne tes hypothèses et t'oppose les meilleurs contre-arguments — sans te contredire gratuitement.",
    opening:
      "Défends ton idée comme si tu devais convaincre quelqu'un de très sceptique. Je vais tester la solidité de tes arguments, pas chercher à te contredire gratuitement.",
  },
  mentor: {
    id: "mentor",
    label: "Mentor",
    tagline: "Apprends pas à pas",
    description:
      "Wize évalue ce que tu sais déjà, pose les bases, puis construit progressivement avec des exemples et de petits exercices.",
    opening:
      "On va construire ta compréhension étape par étape, en partant de ce que tu sais déjà.",
  },
  socratic: {
    id: "socratic",
    label: "Socratique",
    tagline: "Trouve la réponse par toi-même",
    description:
      "Une question à la fois pour faire émerger tes hypothèses cachées. Des indices quand tu bloques, une explication quand il le faut.",
    opening:
      "Je vais surtout te poser des questions. Si tu bloques, je te donnerai des pistes.",
  },
  laboratory: {
    id: "laboratory",
    label: "Laboratoire",
    tagline: "Raisonne en situation",
    description:
      "Un scénario, des décisions, des conséquences qui se révèlent au fil de l'eau — puis un débriefing structuré.",
    opening:
      "On va raisonner sur un scénario. Les éléments fictifs seront toujours signalés comme tels.",
  },
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  decouverte: "Je découvre",
  intermediaire: "J'ai des bases",
  avance: "Je maîtrise déjà bien",
};

export const GOAL_LABELS: Record<LearningGoal, string> = {
  connaissances: "Acquérir de nouvelles connaissances",
  raisonnement: "Améliorer mon raisonnement",
  convictions: "Challenger mes convictions",
  projet: "Préparer un projet concret",
  culture: "Développer ma culture générale",
};

export const PREFERENCE_LABELS: Record<InteractionPreference, string> = {
  bienveillant: "Bienveillant et pédagogique",
  exigeant: "Direct et exigeant",
  socratique: "Socratique, avec beaucoup de questions",
  equilibre: "Équilibré",
};

export const OBJECTIVE_KIND_LABELS: Record<ObjectiveKind, string> = {
  understand: "Comprendre un sujet",
  skill: "Améliorer une compétence",
  explore: "Explorer une question",
  decision: "Préparer une décision",
};

export const OBJECTIVE_STATUS_LABELS: Record<ObjectiveStatus, string> = {
  not_started: "Pas commencé",
  in_progress: "En cours",
  completed: "Terminé",
};

export const SUGGESTED_SUBJECTS = [
  "Pourquoi certaines entreprises dominent-elles leur marché ?",
  "Comment fonctionne la persuasion ?",
  "Qu'est-ce qui rend un argument convaincant ?",
  "Comment prendre de meilleures décisions ?",
  "Comment comprendre les mécanismes économiques ?",
];

export const INTEREST_SUGGESTIONS = [
  "Économie",
  "Philosophie",
  "Entrepreneuriat",
  "Sciences",
  "Histoire",
  "Psychologie",
  "Politique",
  "Technologie",
  "Écriture",
  "Stratégie",
];

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const relativeFormatter = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatRelative(iso: string, now = Date.now()): string {
  const diffMs = new Date(iso).getTime() - now;
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return relativeFormatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeFormatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return relativeFormatter.format(days, "day");
  return formatDate(iso);
}
