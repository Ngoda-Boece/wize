import type {
  Conversation,
  Message,
  MessageRole,
  MessageStatus,
  Mode,
  Objective,
  ObjectiveKind,
  ObjectiveStatus,
  Profile,
  ProgressStats,
  SessionSummary,
  SummaryContent,
} from "@/lib/types";
import type { ProfileInput } from "@/lib/validation";

export class DuplicateMessageError extends Error {
  constructor() {
    super("Ce message a déjà été envoyé.");
  }
}

export type NewMessage = {
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  mode: Mode | null;
  clientId?: string;
};

export type ConversationListOptions = { query?: string; limit: number; offset: number };

/**
 * Data access for ONE authenticated user. Every implementation is constructed
 * with the user id taken from the server session and must scope every query
 * to it (the Supabase implementation is additionally protected by RLS).
 */
export interface Repository {
  getProfile(): Promise<Profile | null>;
  saveProfile(input: ProfileInput & { onboardingCompleted?: boolean }): Promise<Profile>;

  listConversations(opts: ConversationListOptions): Promise<{ items: Conversation[]; hasMore: boolean }>;
  getConversation(id: string): Promise<Conversation | null>;
  createConversation(input: { title: string; subject: string; mode: Mode; objectiveId: string | null }): Promise<Conversation>;
  updateConversation(
    id: string,
    patch: Partial<Pick<Conversation, "title" | "mode" | "status">>,
  ): Promise<Conversation | null>;
  /** Touches updated_at so the conversation moves to the top of the history. */
  touchConversation(id: string): Promise<void>;
  deleteConversation(id: string): Promise<boolean>;

  /** Chronological. With `limit`, returns the most recent `limit` messages. */
  listMessages(conversationId: string, opts?: { limit?: number }): Promise<Message[]>;
  countMessages(conversationId: string): Promise<number>;
  /** Throws DuplicateMessageError when `clientId` was already used in this conversation. */
  addMessage(input: NewMessage): Promise<Message>;

  listObjectives(): Promise<Objective[]>;
  createObjective(input: { title: string; description: string; kind: ObjectiveKind }): Promise<Objective>;
  setObjectiveStatus(id: string, status: ObjectiveStatus): Promise<Objective | null>;
  deleteObjective(id: string): Promise<boolean>;

  getSummary(conversationId: string): Promise<SessionSummary | null>;
  saveSummary(conversationId: string, content: SummaryContent): Promise<SessionSummary>;
  listSummaries(opts: { limit: number }): Promise<SessionSummary[]>;
  deleteSummary(id: string): Promise<boolean>;

  getStats(): Promise<ProgressStats>;

  /** Deletes every record owned by the user (conversations, messages, summaries, objectives, profile data). */
  deleteAllData(): Promise<void>;
}

export const RECENT_CONCEPTS_LIMIT = 12;
export const WEEKS_OF_ACTIVITY = 8;

/** Monday 00:00 UTC of the week containing `date`, as YYYY-MM-DD. */
export function weekStart(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/** Shared stats computation so both implementations report identical numbers. */
export function computeStats(
  conversations: Pick<Conversation, "id" | "title" | "subject" | "status" | "createdAt">[],
  objectives: Pick<Objective, "status">[],
  summaries: Pick<SessionSummary, "conversationId" | "conversationTitle" | "summary" | "createdAt">[],
  now = new Date(),
): ProgressStats {
  const subjects = new Set(conversations.map((c) => c.subject.trim().toLowerCase()));

  const concepts = new Set<string>();
  const recentConcepts: ProgressStats["recentConcepts"] = [];
  const sortedSummaries = [...summaries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const s of sortedSummaries) {
    for (const concept of s.summary.keyConcepts) {
      const key = concept.trim().toLowerCase();
      if (!key || concepts.has(key)) continue;
      concepts.add(key);
      if (recentConcepts.length < RECENT_CONCEPTS_LIMIT) {
        recentConcepts.push({ concept, conversationId: s.conversationId, conversationTitle: s.conversationTitle });
      }
    }
  }

  const weeks: ProgressStats["weeklySessions"] = [];
  const current = new Date(weekStart(now));
  for (let i = WEEKS_OF_ACTIVITY - 1; i >= 0; i--) {
    const d = new Date(current);
    d.setUTCDate(d.getUTCDate() - i * 7);
    weeks.push({ weekStart: d.toISOString().slice(0, 10), count: 0 });
  }
  for (const c of conversations) {
    const w = weeks.find((x) => x.weekStart === weekStart(new Date(c.createdAt)));
    if (w) w.count++;
  }

  return {
    subjectsExplored: subjects.size,
    sessionsTotal: conversations.length,
    sessionsCompleted: conversations.filter((c) => c.status === "completed").length,
    objectivesActive: objectives.filter((o) => o.status !== "completed").length,
    objectivesCompleted: objectives.filter((o) => o.status === "completed").length,
    conceptsReviewed: concepts.size,
    recentConcepts,
    weeklySessions: weeks,
  };
}

/** Derives a short session title from the subject the user typed. */
export function titleFromSubject(subject: string): string {
  const clean = subject.replace(/\s+/g, " ").trim();
  if (clean.length <= 72) return clean;
  const cut = clean.slice(0, 72);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : 72)}…`;
}
