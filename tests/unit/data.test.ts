import { describe, expect, it } from "vitest";
import { buildMockSummary } from "@/lib/ai/mock";
import { safeNext } from "@/lib/auth/safe-next";
import { computeStats, DuplicateMessageError, titleFromSubject } from "@/lib/data/repository";
import { sanitizeSearch } from "@/lib/data/supabase-repository";
import { isSameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { newUser } from "./helpers";

describe("repository scoping", () => {
  it("never exposes one user's records to another", async () => {
    const alice = newUser();
    const bob = newUser();
    const c = await alice.repo.createConversation({ title: "Privé", subject: "Privé", mode: "mentor", objectiveId: null });
    await alice.repo.addMessage({ conversationId: c.id, role: "user", content: "secret", status: "complete", mode: "mentor" });

    expect(await bob.repo.getConversation(c.id)).toBeNull();
    expect((await bob.repo.listConversations({ limit: 10, offset: 0 })).items).toHaveLength(0);
    expect(await bob.repo.listMessages(c.id)).toEqual([]);
    expect(await bob.repo.deleteConversation(c.id)).toBe(false);
    expect(await bob.repo.updateConversation(c.id, { title: "pwned" })).toBeNull();
    await expect(
      bob.repo.addMessage({ conversationId: c.id, role: "user", content: "x", status: "complete", mode: "mentor" }),
    ).rejects.toThrow();
    expect((await alice.repo.getConversation(c.id))?.title).toBe("Privé");
  });

  it("deleting a conversation removes its messages and summary", async () => {
    const { repo } = newUser();
    const c = await repo.createConversation({ title: "t", subject: "s", mode: "mentor", objectiveId: null });
    await repo.addMessage({ conversationId: c.id, role: "user", content: "x", status: "complete", mode: "mentor" });
    await repo.saveSummary(c.id, buildMockSummary("s", ""));
    expect(await repo.deleteConversation(c.id)).toBe(true);
    expect(await repo.listMessages(c.id)).toEqual([]);
    expect(await repo.getSummary(c.id)).toBeNull();
    expect(await repo.listSummaries({ limit: 10 })).toEqual([]);
  });

  it("rejects a reused idempotency key", async () => {
    const { repo } = newUser();
    const c = await repo.createConversation({ title: "t", subject: "s", mode: "mentor", objectiveId: null });
    await repo.addMessage({ conversationId: c.id, role: "user", content: "x", status: "complete", mode: "mentor", clientId: "k" });
    await expect(
      repo.addMessage({ conversationId: c.id, role: "user", content: "x", status: "complete", mode: "mentor", clientId: "k" }),
    ).rejects.toBeInstanceOf(DuplicateMessageError);
  });

  it("searches history by title or subject and paginates", async () => {
    const { repo } = newUser();
    for (let i = 0; i < 25; i++) {
      await repo.createConversation({ title: `Session ${i}`, subject: i === 3 ? "Économie comportementale" : "Divers", mode: "mentor", objectiveId: null });
    }
    const page1 = await repo.listConversations({ limit: 20, offset: 0 });
    expect(page1.items).toHaveLength(20);
    expect(page1.hasMore).toBe(true);
    expect(page1.items[0]!.title).toBe("Session 24");
    const page2 = await repo.listConversations({ limit: 20, offset: 20 });
    expect(page2.items).toHaveLength(5);
    expect(page2.hasMore).toBe(false);
    expect((await repo.listConversations({ query: "économie", limit: 20, offset: 0 })).items.map((c) => c.title)).toEqual(["Session 3"]);
  });

  it("objective completion is explicit and timestamped", async () => {
    const { repo } = newUser();
    const o = await repo.createObjective({ title: "Comprendre l'inflation", description: "", kind: "understand" });
    expect(o.status).toBe("not_started");
    const done = await repo.setObjectiveStatus(o.id, "completed");
    expect(done?.completedAt).not.toBeNull();
    const reopened = await repo.setObjectiveStatus(o.id, "in_progress");
    expect(reopened?.completedAt).toBeNull();
  });
});

describe("progress statistics", () => {
  it("are all zero for a new user (no invented metrics)", async () => {
    const stats = await newUser().repo.getStats();
    expect(stats).toMatchObject({
      subjectsExplored: 0,
      sessionsTotal: 0,
      sessionsCompleted: 0,
      objectivesActive: 0,
      objectivesCompleted: 0,
      conceptsReviewed: 0,
      recentConcepts: [],
    });
    expect(stats.weeklySessions).toHaveLength(8);
    expect(stats.weeklySessions.every((w) => w.count === 0)).toBe(true);
  });

  it("count distinct subjects and concepts from persisted data", () => {
    const now = new Date("2026-10-22T12:00:00Z");
    const summary = (concepts: string[]) => ({ ...buildMockSummary("s", ""), keyConcepts: concepts });
    const stats = computeStats(
      [
        { id: "1", title: "a", subject: "Économie", status: "completed", createdAt: "2026-10-21T10:00:00Z" },
        { id: "2", title: "b", subject: "économie ", status: "active", createdAt: "2026-10-01T10:00:00Z" },
      ],
      [{ status: "in_progress" }, { status: "completed" }],
      [
        { conversationId: "1", conversationTitle: "a", summary: summary(["Offre", "Demande"]), createdAt: "2026-10-21T11:00:00Z" },
        { conversationId: "2", conversationTitle: "b", summary: summary(["offre"]), createdAt: "2026-10-02T11:00:00Z" },
      ],
      now,
    );
    expect(stats.subjectsExplored).toBe(1);
    expect(stats.sessionsCompleted).toBe(1);
    expect(stats.objectivesActive).toBe(1);
    expect(stats.conceptsReviewed).toBe(2);
    expect(stats.weeklySessions.at(-1)!.count).toBe(1);
  });
});

describe("security helpers", () => {
  it("only accepts same-site relative redirects", () => {
    expect(safeNext("/app/history")).toBe("/app/history");
    expect(safeNext("//evil.com")).toBe("/app");
    expect(safeNext("https://evil.com")).toBe("/app");
    expect(safeNext("/\\evil.com")).toBe("/app");
    expect(safeNext(undefined)).toBe("/app");
  });

  it("strips PostgREST filter syntax from search terms", () => {
    expect(sanitizeSearch("a,b),title.eq.x")).toBe("a b title eq x");
  });

  it("detects cross-origin requests", () => {
    const req = (origin?: string) =>
      new Request("http://localhost:3000/api/chat", { method: "POST", headers: { host: "localhost:3000", ...(origin ? { origin } : {}) } });
    expect(isSameOrigin(req("http://localhost:3000"))).toBe(true);
    expect(isSameOrigin(req("https://evil.example"))).toBe(false);
  });

  it("rate limits per key within a window", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 2, 1000, 0).ok).toBe(true);
    expect(rateLimit(key, 2, 1000, 1).ok).toBe(true);
    expect(rateLimit(key, 2, 1000, 2)).toMatchObject({ ok: false });
    expect(rateLimit(key, 2, 1000, 1001).ok).toBe(true);
  });

  it("derives a readable session title", () => {
    expect(titleFromSubject("  Court  ")).toBe("Court");
    expect(titleFromSubject("x ".repeat(80)).length).toBeLessThanOrEqual(73);
  });
});
