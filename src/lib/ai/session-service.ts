import type { Repository } from "@/lib/data/repository";
import type { Conversation, Message } from "@/lib/types";
import { buildSystemPrompt, SUMMARY_INSTRUCTIONS } from "./prompts";
import { AiError, aiError, type ChatProvider, type ChatTurn } from "./provider";
import { summarySchema } from "./schemas";

/** Number of most recent messages sent to the model on each turn. */
export const CONTEXT_MESSAGE_LIMIT = 40;
/** Max characters of transcript sent for a summary (keeps the most recent part). */
export const SUMMARY_TRANSCRIPT_MAX_CHARS = 120_000;

/**
 * Converts stored messages to provider turns: the first turn must come from
 * the user and roles must alternate, so leading assistant messages are dropped
 * and consecutive messages with the same role are merged (this happens when a
 * reply failed and the user wrote again instead of retrying).
 */
export function toProviderTurns(messages: Pick<Message, "role" | "content" | "status">[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of messages) {
    const content = m.status === "partial" ? `${m.content}\n\n[Réponse interrompue]` : m.content;
    const last = turns[turns.length - 1];
    if (!last && m.role === "assistant") continue;
    if (last && last.role === m.role) last.content += `\n\n${content}`;
    else turns.push({ role: m.role, content });
  }
  return turns;
}

/** Assembles system prompt + recent history for the next assistant turn. */
export async function buildModelInput(repo: Repository, conversation: Conversation) {
  const [history, total, profile, objectives] = await Promise.all([
    repo.listMessages(conversation.id, { limit: CONTEXT_MESSAGE_LIMIT }),
    repo.countMessages(conversation.id),
    repo.getProfile(),
    conversation.objectiveId ? repo.listObjectives() : Promise.resolve([]),
  ]);
  const olderMessagesOmitted = total > history.length;
  // When old turns are cut, a saved session summary (if any) keeps the thread.
  const earlierSummary = olderMessagesOmitted ? ((await repo.getSummary(conversation.id))?.summary ?? null) : null;

  const system = buildSystemPrompt({
    mode: conversation.mode,
    subject: conversation.subject,
    profile: profile?.personalizationEnabled ? profile : null,
    objective: objectives.find((o) => o.id === conversation.objectiveId) ?? null,
    earlierSummary,
    olderMessagesOmitted,
  });
  return { system, messages: toProviderTurns(history) };
}

/**
 * Streams an assistant reply and persists it.
 *
 * Recovery strategy (documented in the README):
 * - The user message is stored BEFORE the provider is called, so it is never lost.
 * - On success the full reply is stored with status "complete".
 * - If the stream is interrupted (stop button, disconnect, provider error) after
 *   some text was produced, that text is stored with status "partial" and shown
 *   as interrupted. If nothing was produced, nothing is stored and the client
 *   offers a retry that regenerates the reply to the same user message.
 */
export async function generateReply(opts: {
  repo: Repository;
  provider: ChatProvider;
  conversation: Conversation;
  signal: AbortSignal;
  onText: (delta: string) => void;
}): Promise<{ message: Message } | { error: AiError; partial: Message | null }> {
  const { repo, provider, conversation, signal, onText } = opts;
  const input = await buildModelInput(repo, conversation);
  if (input.messages.length === 0 || input.messages[input.messages.length - 1]?.role !== "user") {
    return { error: aiError("provider"), partial: null };
  }

  let text = "";
  try {
    await provider.streamReply({
      ...input,
      signal,
      onText: (delta) => {
        text += delta;
        onText(delta);
      },
    });
  } catch (err) {
    const error = err instanceof AiError ? err : aiError("provider");
    let partial: Message | null = null;
    if (text.trim()) {
      partial = await repo.addMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: text,
        status: "partial",
        mode: conversation.mode,
      });
      await repo.touchConversation(conversation.id);
    }
    return { error, partial };
  }

  if (!text.trim()) return { error: aiError("provider"), partial: null };
  const message = await repo.addMessage({
    conversationId: conversation.id,
    role: "assistant",
    content: text,
    status: "complete",
    mode: conversation.mode,
  });
  await repo.touchConversation(conversation.id);
  return { message };
}

/** Plain-text transcript used for summaries. Keeps the most recent part if too long. */
export function buildTranscript(conversation: Conversation, messages: Message[]): string {
  const body = messages
    .map((m) => `${m.role === "user" ? "Utilisateur" : "Wize"} : ${m.content}`)
    .join("\n\n");
  const trimmed = body.length > SUMMARY_TRANSCRIPT_MAX_CHARS ? body.slice(-SUMMARY_TRANSCRIPT_MAX_CHARS) : body;
  return `Sujet : ${conversation.subject}\nTitre : ${conversation.title}\n\n${trimmed}`;
}

export class SummaryValidationError extends Error {
  constructor() {
    super("La synthèse générée n'a pas un format valide. Réessaie.");
  }
}

/** Generates a draft summary (not stored). Throws SummaryValidationError on malformed output. */
export async function generateSummaryDraft(provider: ChatProvider, conversation: Conversation, messages: Message[]) {
  const raw = await provider.generateSummary({
    system: SUMMARY_INSTRUCTIONS,
    transcript: buildTranscript(conversation, messages),
  });
  const parsed = summarySchema.safeParse(raw);
  if (!parsed.success) throw new SummaryValidationError();
  return parsed.data;
}
