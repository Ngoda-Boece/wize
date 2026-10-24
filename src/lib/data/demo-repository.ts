import { randomUUID } from "node:crypto";
import type { Conversation, Message, Objective, Profile, SessionSummary } from "@/lib/types";
import {
  computeStats,
  DuplicateMessageError,
  type ConversationListOptions,
  type NewMessage,
  type Repository,
} from "./repository";

// In-memory store used only in demo mode (Supabase not configured). Data is
// partitioned by demo user id and lost when the server restarts. It lives on
// globalThis so it survives dev-server hot reloads.
type UserStore = {
  profile: Profile | null;
  conversations: Map<string, Conversation>;
  messages: Map<string, (Message & { clientId?: string })[]>;
  objectives: Map<string, Objective>;
  summaries: Map<string, SessionSummary>;
};

const globalStore = globalThis as unknown as { __wizeDemoStore?: Map<string, UserStore> };
const store = (globalStore.__wizeDemoStore ??= new Map());

// Prevents unbounded memory growth on a public demo deployment.
const MAX_DEMO_USERS = 500;

function userStore(userId: string): UserStore {
  let s = store.get(userId);
  if (!s) {
    if (store.size >= MAX_DEMO_USERS) {
      const oldest = store.keys().next().value;
      if (oldest) store.delete(oldest);
    }
    s = { profile: null, conversations: new Map(), messages: new Map(), objectives: new Map(), summaries: new Map() };
    store.set(userId, s);
  }
  return s;
}

/** Strictly increasing ISO timestamps so ordering is deterministic. */
let lastTs = 0;
function nowIso(): string {
  lastTs = Math.max(Date.now(), lastTs + 1);
  return new Date(lastTs).toISOString();
}

function stripClientId(m: Message & { clientId?: string }): Message {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    status: m.status,
    mode: m.mode,
    createdAt: m.createdAt,
  };
}

export class DemoRepository implements Repository {
  private s: UserStore;

  constructor(userId: string) {
    this.s = userStore(userId);
  }

  async getProfile() {
    return this.s.profile;
  }

  async saveProfile(input: Parameters<Repository["saveProfile"]>[0]) {
    const prev = this.s.profile;
    this.s.profile = {
      id: "demo",
      displayName: input.displayName || null,
      learningInterests: input.learningInterests,
      experienceLevel: input.experienceLevel,
      learningGoal: input.learningGoal,
      interactionPreference: input.interactionPreference,
      personalizationEnabled: input.personalizationEnabled,
      onboardingCompleted: input.onboardingCompleted ?? prev?.onboardingCompleted ?? false,
    };
    return this.s.profile;
  }

  async listConversations({ query, limit, offset }: ConversationListOptions) {
    const q = query?.trim().toLowerCase();
    const all = [...this.s.conversations.values()]
      .filter((c) => !q || c.title.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { items: all.slice(offset, offset + limit), hasMore: all.length > offset + limit };
  }

  async getConversation(id: string) {
    return this.s.conversations.get(id) ?? null;
  }

  async createConversation(input: Parameters<Repository["createConversation"]>[0]) {
    const ts = nowIso();
    const objectiveId = input.objectiveId && this.s.objectives.has(input.objectiveId) ? input.objectiveId : null;
    const c: Conversation = { id: randomUUID(), status: "active", createdAt: ts, updatedAt: ts, ...input, objectiveId };
    this.s.conversations.set(c.id, c);
    this.s.messages.set(c.id, []);
    return c;
  }

  async updateConversation(id: string, patch: Parameters<Repository["updateConversation"]>[1]) {
    const c = this.s.conversations.get(id);
    if (!c) return null;
    const next = { ...c, ...patch, updatedAt: nowIso() };
    this.s.conversations.set(id, next);
    return next;
  }

  async touchConversation(id: string) {
    const c = this.s.conversations.get(id);
    if (c) this.s.conversations.set(id, { ...c, updatedAt: nowIso() });
  }

  async deleteConversation(id: string) {
    if (!this.s.conversations.delete(id)) return false;
    this.s.messages.delete(id);
    for (const [sid, summary] of this.s.summaries) if (summary.conversationId === id) this.s.summaries.delete(sid);
    return true;
  }

  async listMessages(conversationId: string, opts?: { limit?: number }) {
    const list = this.s.messages.get(conversationId) ?? [];
    const slice = opts?.limit ? list.slice(-opts.limit) : list;
    return slice.map(stripClientId);
  }

  async countMessages(conversationId: string) {
    return this.s.messages.get(conversationId)?.length ?? 0;
  }

  async addMessage(input: NewMessage) {
    const list = this.s.messages.get(input.conversationId);
    if (!list || !this.s.conversations.has(input.conversationId)) throw new Error("Conversation introuvable");
    if (input.clientId && list.some((m) => m.clientId === input.clientId)) throw new DuplicateMessageError();
    const m = {
      id: randomUUID(),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      status: input.status,
      mode: input.mode,
      createdAt: nowIso(),
      clientId: input.clientId,
    };
    list.push(m);
    return stripClientId(m);
  }

  async listObjectives() {
    return [...this.s.objectives.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createObjective(input: Parameters<Repository["createObjective"]>[0]) {
    const ts = nowIso();
    const o: Objective = { id: randomUUID(), status: "not_started", createdAt: ts, updatedAt: ts, completedAt: null, ...input };
    this.s.objectives.set(o.id, o);
    return o;
  }

  async setObjectiveStatus(id: string, status: Objective["status"]) {
    const o = this.s.objectives.get(id);
    if (!o) return null;
    const ts = nowIso();
    const next = { ...o, status, updatedAt: ts, completedAt: status === "completed" ? ts : null };
    this.s.objectives.set(id, next);
    return next;
  }

  async deleteObjective(id: string) {
    const deleted = this.s.objectives.delete(id);
    if (deleted) {
      for (const [cid, c] of this.s.conversations) {
        if (c.objectiveId === id) this.s.conversations.set(cid, { ...c, objectiveId: null });
      }
    }
    return deleted;
  }

  async getSummary(conversationId: string) {
    return [...this.s.summaries.values()].find((s) => s.conversationId === conversationId) ?? null;
  }

  async saveSummary(conversationId: string, content: SessionSummary["summary"]) {
    const conversation = this.s.conversations.get(conversationId);
    if (!conversation) throw new Error("Conversation introuvable");
    const existing = await this.getSummary(conversationId);
    const ts = nowIso();
    const summary: SessionSummary = existing
      ? { ...existing, summary: content, updatedAt: ts }
      : { id: randomUUID(), conversationId, conversationTitle: conversation.title, summary: content, createdAt: ts, updatedAt: ts };
    this.s.summaries.set(summary.id, summary);
    return summary;
  }

  async listSummaries({ limit }: { limit: number }) {
    return [...this.s.summaries.values()]
      .map((s) => ({ ...s, conversationTitle: this.s.conversations.get(s.conversationId)?.title ?? s.conversationTitle }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async deleteSummary(id: string) {
    return this.s.summaries.delete(id);
  }

  async getStats() {
    return computeStats(
      [...this.s.conversations.values()],
      [...this.s.objectives.values()],
      await this.listSummaries({ limit: 1000 }),
    );
  }

  async deleteAllData() {
    this.s.conversations.clear();
    this.s.messages.clear();
    this.s.objectives.clear();
    this.s.summaries.clear();
    this.s.profile = null;
  }
}
