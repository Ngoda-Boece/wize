import type { SupabaseClient } from "@supabase/supabase-js";
import { summarySchema } from "@/lib/ai/schemas";
import type {
  Conversation,
  Message,
  Objective,
  Profile,
  SessionSummary,
  SummaryContent,
} from "@/lib/types";
import {
  computeStats,
  DuplicateMessageError,
  type ConversationListOptions,
  type NewMessage,
  type Repository,
} from "./repository";

// Row shapes as stored in Postgres (see supabase/migrations).
type ProfileRow = {
  id: string;
  display_name: string | null;
  onboarding_completed: boolean;
  learning_interests: string[];
  experience_level: Profile["experienceLevel"];
  learning_goal: Profile["learningGoal"];
  interaction_preference: Profile["interactionPreference"];
  personalization_enabled: boolean;
};
type ConversationRow = {
  id: string;
  title: string;
  subject: string;
  mode: Conversation["mode"];
  status: Conversation["status"];
  objective_id: string | null;
  created_at: string;
  updated_at: string;
};
type MessageRow = {
  id: string;
  conversation_id: string;
  role: Message["role"];
  content: string;
  status: Message["status"];
  mode: Message["mode"];
  created_at: string;
};
type ObjectiveRow = {
  id: string;
  title: string;
  description: string;
  kind: Objective["kind"];
  status: Objective["status"];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};
type SummaryRow = {
  id: string;
  conversation_id: string;
  summary: unknown;
  created_at: string;
  updated_at: string;
  conversations: { title: string } | null;
};

const CONVERSATION_COLS = "id,title,subject,mode,status,objective_id,created_at,updated_at";
const MESSAGE_COLS = "id,conversation_id,role,content,status,mode,created_at";
const OBJECTIVE_COLS = "id,title,description,kind,status,created_at,updated_at,completed_at";
const SUMMARY_COLS = "id,conversation_id,summary,created_at,updated_at,conversations(title)";

const toProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  displayName: r.display_name,
  onboardingCompleted: r.onboarding_completed,
  learningInterests: r.learning_interests ?? [],
  experienceLevel: r.experience_level,
  learningGoal: r.learning_goal,
  interactionPreference: r.interaction_preference,
  personalizationEnabled: r.personalization_enabled,
});
const toConversation = (r: ConversationRow): Conversation => ({
  id: r.id,
  title: r.title,
  subject: r.subject,
  mode: r.mode,
  status: r.status,
  objectiveId: r.objective_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const toMessage = (r: MessageRow): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  role: r.role,
  content: r.content,
  status: r.status,
  mode: r.mode,
  createdAt: r.created_at,
});
const toObjective = (r: ObjectiveRow): Objective => ({
  id: r.id,
  title: r.title,
  description: r.description,
  kind: r.kind,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  completedAt: r.completed_at,
});
function toSummary(r: SummaryRow): SessionSummary | null {
  // Stored JSON is re-validated on read so a malformed row can never crash a page.
  const parsed = summarySchema.safeParse(r.summary);
  if (!parsed.success) return null;
  return {
    id: r.id,
    conversationId: r.conversation_id,
    conversationTitle: r.conversations?.title ?? parsed.data.title,
    summary: parsed.data,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Removes characters with a meaning in PostgREST filter syntax. */
export function sanitizeSearch(query: string): string {
  return query.replace(/[,()*%\\:."]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

class DataError extends Error {}

function check<T>(result: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (result.error) throw new DataError(`Erreur de base de données (${result.error.code ?? "inconnue"})`);
  return result.data as T;
}

/**
 * Supabase-backed repository. Uses the user's session (RLS enforced) and also
 * filters by user_id explicitly as defence in depth.
 */
export class SupabaseRepository implements Repository {
  constructor(
    private db: SupabaseClient,
    private userId: string,
  ) {}

  async getProfile() {
    const row = check(await this.db.from("profiles").select("*").eq("id", this.userId).maybeSingle<ProfileRow>());
    return row ? toProfile(row) : null;
  }

  async saveProfile(input: Parameters<Repository["saveProfile"]>[0]) {
    const row = check(
      await this.db
        .from("profiles")
        .upsert({
          id: this.userId,
          display_name: input.displayName || null,
          learning_interests: input.learningInterests,
          experience_level: input.experienceLevel,
          learning_goal: input.learningGoal,
          interaction_preference: input.interactionPreference,
          personalization_enabled: input.personalizationEnabled,
          ...(input.onboardingCompleted !== undefined ? { onboarding_completed: input.onboardingCompleted } : {}),
        })
        .select("*")
        .single<ProfileRow>(),
    );
    return toProfile(row);
  }

  async listConversations({ query, limit, offset }: ConversationListOptions) {
    let q = this.db
      .from("conversations")
      .select(CONVERSATION_COLS)
      .eq("user_id", this.userId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit); // one extra row to detect "hasMore"
    const term = query ? sanitizeSearch(query) : "";
    if (term) q = q.or(`title.ilike.*${term}*,subject.ilike.*${term}*`);
    const rows = check(await q.returns<ConversationRow[]>());
    return { items: rows.slice(0, limit).map(toConversation), hasMore: rows.length > limit };
  }

  async getConversation(id: string) {
    const row = check(
      await this.db
        .from("conversations")
        .select(CONVERSATION_COLS)
        .eq("id", id)
        .eq("user_id", this.userId)
        .maybeSingle<ConversationRow>(),
    );
    return row ? toConversation(row) : null;
  }

  async createConversation(input: Parameters<Repository["createConversation"]>[0]) {
    const row = check(
      await this.db
        .from("conversations")
        .insert({
          user_id: this.userId,
          title: input.title,
          subject: input.subject,
          mode: input.mode,
          objective_id: input.objectiveId,
        })
        .select(CONVERSATION_COLS)
        .single<ConversationRow>(),
    );
    return toConversation(row);
  }

  async updateConversation(id: string, patch: Parameters<Repository["updateConversation"]>[1]) {
    const row = check(
      await this.db
        .from("conversations")
        .update(patch)
        .eq("id", id)
        .eq("user_id", this.userId)
        .select(CONVERSATION_COLS)
        .maybeSingle<ConversationRow>(),
    );
    return row ? toConversation(row) : null;
  }

  async touchConversation(id: string) {
    // Any update fires the updated_at trigger, which sets the timestamp to now().
    check(
      await this.db
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", this.userId),
    );
  }

  async deleteConversation(id: string) {
    // Messages and summaries are removed by ON DELETE CASCADE.
    const rows = check(
      await this.db.from("conversations").delete().eq("id", id).eq("user_id", this.userId).select("id"),
    );
    return rows.length > 0;
  }

  async listMessages(conversationId: string, opts?: { limit?: number }) {
    let q = this.db
      .from("messages")
      .select(MESSAGE_COLS)
      .eq("conversation_id", conversationId)
      .eq("user_id", this.userId)
      .order("created_at", { ascending: !opts?.limit });
    if (opts?.limit) q = q.limit(opts.limit);
    const rows = check(await q.returns<MessageRow[]>());
    const messages = rows.map(toMessage);
    return opts?.limit ? messages.reverse() : messages;
  }

  async countMessages(conversationId: string) {
    const { count, error } = await this.db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("user_id", this.userId);
    if (error) throw new DataError("Erreur de base de données");
    return count ?? 0;
  }

  async addMessage(input: NewMessage) {
    const result = await this.db
      .from("messages")
      .insert({
        conversation_id: input.conversationId,
        user_id: this.userId,
        role: input.role,
        content: input.content,
        status: input.status,
        mode: input.mode,
        client_id: input.clientId ?? null,
      })
      .select(MESSAGE_COLS)
      .single<MessageRow>();
    if (result.error?.code === "23505") throw new DuplicateMessageError();
    return toMessage(check(result));
  }

  async listObjectives() {
    const rows = check(
      await this.db
        .from("learning_objectives")
        .select(OBJECTIVE_COLS)
        .eq("user_id", this.userId)
        .order("created_at", { ascending: false })
        .returns<ObjectiveRow[]>(),
    );
    return rows.map(toObjective);
  }

  async createObjective(input: Parameters<Repository["createObjective"]>[0]) {
    const row = check(
      await this.db
        .from("learning_objectives")
        .insert({ ...input, user_id: this.userId })
        .select(OBJECTIVE_COLS)
        .single<ObjectiveRow>(),
    );
    return toObjective(row);
  }

  async setObjectiveStatus(id: string, status: Objective["status"]) {
    const row = check(
      await this.db
        .from("learning_objectives")
        .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
        .eq("id", id)
        .eq("user_id", this.userId)
        .select(OBJECTIVE_COLS)
        .maybeSingle<ObjectiveRow>(),
    );
    return row ? toObjective(row) : null;
  }

  async deleteObjective(id: string) {
    const rows = check(
      await this.db.from("learning_objectives").delete().eq("id", id).eq("user_id", this.userId).select("id"),
    );
    return rows.length > 0;
  }

  async getSummary(conversationId: string) {
    const row = check(
      await this.db
        .from("session_summaries")
        .select(SUMMARY_COLS)
        .eq("conversation_id", conversationId)
        .eq("user_id", this.userId)
        .maybeSingle<SummaryRow>(),
    );
    return row ? toSummary(row) : null;
  }

  async saveSummary(conversationId: string, content: SummaryContent) {
    const row = check(
      await this.db
        .from("session_summaries")
        .upsert({ conversation_id: conversationId, user_id: this.userId, summary: content }, { onConflict: "conversation_id" })
        .select(SUMMARY_COLS)
        .single<SummaryRow>(),
    );
    const summary = toSummary(row);
    if (!summary) throw new DataError("Synthèse invalide");
    return summary;
  }

  async listSummaries({ limit }: { limit: number }) {
    const rows = check(
      await this.db
        .from("session_summaries")
        .select(SUMMARY_COLS)
        .eq("user_id", this.userId)
        .order("created_at", { ascending: false })
        .limit(limit)
        .returns<SummaryRow[]>(),
    );
    return rows.map(toSummary).filter((s): s is SessionSummary => s !== null);
  }

  async deleteSummary(id: string) {
    const rows = check(
      await this.db.from("session_summaries").delete().eq("id", id).eq("user_id", this.userId).select("id"),
    );
    return rows.length > 0;
  }

  async getStats() {
    // Only lightweight columns are fetched; message bodies are never loaded here.
    const [conversations, objectives, summaries] = await Promise.all([
      this.db
        .from("conversations")
        .select("id,title,subject,status,created_at")
        .eq("user_id", this.userId)
        .limit(5000)
        .returns<{ id: string; title: string; subject: string; status: Conversation["status"]; created_at: string }[]>(),
      this.db.from("learning_objectives").select("status").eq("user_id", this.userId).returns<{ status: Objective["status"] }[]>(),
      this.listSummaries({ limit: 200 }),
    ]);
    return computeStats(
      check(conversations).map((c) => ({ ...c, createdAt: c.created_at })),
      check(objectives),
      summaries,
    );
  }

  async deleteAllData() {
    // Conversations cascade to messages and summaries.
    check(await this.db.from("conversations").delete().eq("user_id", this.userId));
    check(await this.db.from("learning_objectives").delete().eq("user_id", this.userId));
    check(
      await this.db
        .from("profiles")
        .update({
          display_name: null,
          learning_interests: [],
          experience_level: null,
          learning_goal: null,
          interaction_preference: null,
          onboarding_completed: false,
        })
        .eq("id", this.userId),
    );
  }
}
