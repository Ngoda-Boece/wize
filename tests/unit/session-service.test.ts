import { describe, expect, it } from "vitest";
import { buildMockSummary } from "@/lib/ai/mock";
import type { ChatProvider } from "@/lib/ai/provider";
import { summarySchema } from "@/lib/ai/schemas";
import {
  buildModelInput,
  CONTEXT_MESSAGE_LIMIT,
  generateSummaryDraft,
  SummaryValidationError,
  toProviderTurns,
} from "@/lib/ai/session-service";
import { newUser } from "./helpers";

const summaryProvider = (output: unknown): ChatProvider => ({
  kind: "anthropic",
  streamReply: async () => ({ stopReason: "end_turn" }),
  generateSummary: async () => output,
});

describe("toProviderTurns", () => {
  it("drops leading assistant messages and merges consecutive roles", () => {
    expect(
      toProviderTurns([
        { role: "assistant", content: "orphan", status: "complete" },
        { role: "user", content: "A", status: "complete" },
        { role: "user", content: "B", status: "complete" },
        { role: "assistant", content: "C", status: "partial" },
      ]),
    ).toEqual([
      { role: "user", content: "A\n\nB" },
      { role: "assistant", content: "C\n\n[Réponse interrompue]" },
    ]);
  });
});

describe("buildModelInput", () => {
  it("limits the context window to the most recent messages", async () => {
    const { repo } = newUser();
    const c = await repo.createConversation({ title: "t", subject: "s", mode: "mentor", objectiveId: null });
    for (let i = 0; i < CONTEXT_MESSAGE_LIMIT + 6; i++) {
      await repo.addMessage({ conversationId: c.id, role: i % 2 ? "assistant" : "user", content: `m${i}`, status: "complete", mode: "mentor" });
    }
    await repo.addMessage({ conversationId: c.id, role: "user", content: "dernier", status: "complete", mode: "mentor" });
    const input = await buildModelInput(repo, c);
    const total = input.messages.length;
    expect(total).toBeLessThanOrEqual(CONTEXT_MESSAGE_LIMIT);
    expect(input.messages.at(-1)).toEqual({ role: "user", content: "dernier" });
    expect(input.messages[0]!.role).toBe("user");
    expect(input.system).toMatch(/earliest messages/);
  });

  it("respects disabled personalization", async () => {
    const { repo } = newUser();
    await repo.saveProfile({
      displayName: "Alex",
      learningInterests: ["Histoire"],
      experienceLevel: null,
      learningGoal: null,
      interactionPreference: null,
      personalizationEnabled: false,
    });
    const c = await repo.createConversation({ title: "t", subject: "s", mode: "mentor", objectiveId: null });
    await repo.addMessage({ conversationId: c.id, role: "user", content: "Q", status: "complete", mode: "mentor" });
    const { system } = await buildModelInput(repo, c);
    expect(system).not.toContain("Alex");
    expect(system).not.toContain("Histoire");
  });
});

describe("summaries", () => {
  it("rejects malformed structured output", async () => {
    const { repo } = newUser();
    const c = await repo.createConversation({ title: "t", subject: "s", mode: "mentor", objectiveId: null });
    await expect(generateSummaryDraft(summaryProvider({ title: "x" }), c, [])).rejects.toBeInstanceOf(SummaryValidationError);
    await expect(generateSummaryDraft(summaryProvider("not an object"), c, [])).rejects.toBeInstanceOf(SummaryValidationError);
  });

  it("accepts a valid summary", async () => {
    const { repo } = newUser();
    const c = await repo.createConversation({ title: "t", subject: "s", mode: "mentor", objectiveId: null });
    const valid = buildMockSummary("Les marchés", "Utilisateur : Je pense que la concurrence fait baisser les prix.");
    expect(summarySchema.safeParse(valid).success).toBe(true);
    await expect(generateSummaryDraft(summaryProvider(valid), c, [])).resolves.toMatchObject({ subject: "Les marchés" });
  });

  it("mock summary only uses what the user wrote", () => {
    const s = buildMockSummary(
      "Persuasion",
      "Sujet : Persuasion\n\nUtilisateur : Persuasion\n\nWize : Quelle est ta position ?\n\nUtilisateur : La répétition rend une idée crédible. Surtout sur les réseaux.",
    );
    expect(s.initialHypothesis).toBe("La répétition rend une idée crédible.");
    expect(s.counterArguments).toEqual([]);
    expect(s.keyConcepts).toContain("répétition");
  });
});
