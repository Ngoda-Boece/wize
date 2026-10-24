// Domain types shared between server and client code.

export const MODES = ["sparring", "mentor", "socratic", "laboratory"] as const;
export type Mode = (typeof MODES)[number];

export const EXPERIENCE_LEVELS = ["decouverte", "intermediaire", "avance"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const LEARNING_GOALS = [
  "connaissances",
  "raisonnement",
  "convictions",
  "projet",
  "culture",
] as const;
export type LearningGoal = (typeof LEARNING_GOALS)[number];

export const INTERACTION_PREFERENCES = [
  "bienveillant",
  "exigeant",
  "socratique",
  "equilibre",
] as const;
export type InteractionPreference = (typeof INTERACTION_PREFERENCES)[number];

export const OBJECTIVE_KINDS = ["understand", "skill", "explore", "decision"] as const;
export type ObjectiveKind = (typeof OBJECTIVE_KINDS)[number];

export const OBJECTIVE_STATUSES = ["not_started", "in_progress", "completed"] as const;
export type ObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number];

export type Profile = {
  id: string;
  displayName: string | null;
  onboardingCompleted: boolean;
  learningInterests: string[];
  experienceLevel: ExperienceLevel | null;
  learningGoal: LearningGoal | null;
  interactionPreference: InteractionPreference | null;
  personalizationEnabled: boolean;
};

export type ConversationStatus = "active" | "completed";

export type Conversation = {
  id: string;
  title: string;
  subject: string;
  mode: Mode;
  status: ConversationStatus;
  objectiveId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageRole = "user" | "assistant";
// "partial" marks an assistant reply that was interrupted (stop button,
// network drop or provider error mid-stream). It is kept so nothing the user
// already read disappears, and it is labelled as incomplete in the UI.
export type MessageStatus = "complete" | "partial";

export type Message = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  mode: Mode | null;
  createdAt: string;
};

export type Objective = {
  id: string;
  title: string;
  description: string;
  kind: ObjectiveKind;
  status: ObjectiveStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type SummaryContent = {
  title: string;
  subject: string;
  centralQuestion: string;
  keyConcepts: string[];
  initialHypothesis: string | null;
  arguments: string[];
  counterArguments: string[];
  misconceptionsClarified: string[];
  openQuestions: string[];
  takeaways: string[];
  nextSteps: string[];
  exercise: string;
};

export type SessionSummary = {
  id: string;
  conversationId: string;
  conversationTitle: string;
  summary: SummaryContent;
  createdAt: string;
  updatedAt: string;
};

export type ProgressStats = {
  subjectsExplored: number;
  sessionsTotal: number;
  sessionsCompleted: number;
  objectivesActive: number;
  objectivesCompleted: number;
  conceptsReviewed: number;
  recentConcepts: { concept: string; conversationId: string; conversationTitle: string }[];
  weeklySessions: { weekStart: string; count: number }[];
};
