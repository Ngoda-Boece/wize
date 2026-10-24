import { generateReply } from "@/lib/ai/session-service";
import { AiError, type ChatProvider } from "@/lib/ai/provider";
import { encodeEvent, type ChatStreamEvent } from "@/lib/chat-protocol";
import { DuplicateMessageError, type Repository } from "@/lib/data/repository";
import { isSameOrigin, jsonError, readJsonBody } from "@/lib/http";
import { acquireGenerationLock, CHAT_RATE_LIMIT, rateLimit, releaseGenerationLock } from "@/lib/rate-limit";
import type { Conversation, Message } from "@/lib/types";
import { chatRequestSchema } from "@/lib/validation";

export type ChatDeps = {
  getViewerId: () => Promise<string | null>;
  getRepository: () => Promise<Repository>;
  getProvider: (conversation: Conversation) => ChatProvider;
};

const MAX_BODY_BYTES = 40_000;

/**
 * POST /api/chat. Dependencies are injected so the full flow (auth, ownership,
 * validation, persistence, streaming, failures) is covered by unit tests.
 */
export async function handleChatRequest(request: Request, deps: ChatDeps): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError(403, "forbidden", "Origine non autorisée.");

  const viewerId = await deps.getViewerId();
  if (!viewerId) return jsonError(401, "unauthenticated", "Connecte-toi pour continuer.");

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) {
    return body.status === 413
      ? jsonError(413, "too_large", "Message trop long.")
      : jsonError(400, "invalid_json", "Requête invalide.");
  }
  const parsed = chatRequestSchema.safeParse(body.data);
  if (!parsed.success) return jsonError(400, "invalid_request", "Requête invalide ou message trop long.");
  const req = parsed.data;

  const limited = rateLimit(`chat:${viewerId}`, CHAT_RATE_LIMIT.limit, CHAT_RATE_LIMIT.windowMs);
  if (!limited.ok) {
    return jsonError(429, "rate_limited", "Tu envoies beaucoup de messages. Patiente quelques secondes.", {
      retryAfter: limited.retryAfterSeconds,
    });
  }

  const repo = await deps.getRepository();
  // Ownership check: the repository is scoped to the viewer, so another user's
  // conversation id simply resolves to "not found".
  const conversation = await repo.getConversation(req.conversationId);
  if (!conversation) return jsonError(404, "not_found", "Conversation introuvable.");

  let provider: ChatProvider;
  try {
    provider = deps.getProvider(conversation);
  } catch (err) {
    const message = err instanceof AiError ? err.message : "Service d'IA indisponible.";
    return jsonError(503, "ai_unconfigured", message);
  }

  if (!acquireGenerationLock(conversation.id)) {
    return jsonError(409, "busy", "Une réponse est déjà en cours pour cette conversation.");
  }

  let userMessage: Message | null = null;
  try {
    if (req.message) {
      userMessage = await repo.addMessage({
        conversationId: conversation.id,
        role: "user",
        content: req.message,
        status: "complete",
        mode: conversation.mode,
        clientId: req.clientMessageId,
      });
      await repo.touchConversation(conversation.id);
    } else {
      // Retry: only allowed when the last stored message is the user's, so a
      // retry never duplicates a message nor replaces an existing reply.
      const [last] = await repo.listMessages(conversation.id, { limit: 1 });
      if (last?.role !== "user") {
        releaseGenerationLock(conversation.id);
        return jsonError(409, "nothing_to_retry", "Il n'y a rien à régénérer.");
      }
    }
  } catch (err) {
    releaseGenerationLock(conversation.id);
    if (err instanceof DuplicateMessageError) return jsonError(409, "duplicate", err.message);
    return jsonError(500, "storage", "Impossible d'enregistrer le message. Réessaie.");
  }

  // The stop button aborts the fetch, which aborts the request signal and the
  // generation. Persistence still runs afterwards: text already produced is
  // saved as a "partial" reply instead of being lost.
  const controller = new AbortController();
  request.signal.addEventListener("abort", () => controller.abort(), { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      let open = true;
      const send = (event: ChatStreamEvent) => {
        if (!open) return;
        try {
          streamController.enqueue(encodeEvent(event));
        } catch {
          open = false;
        }
      };
      try {
        send({ type: "start", userMessage, simulated: provider.kind === "mock" });
        const result = await generateReply({
          repo,
          provider,
          conversation,
          signal: controller.signal,
          onText: (text) => send({ type: "delta", text }),
        });
        if ("message" in result) send({ type: "done", message: result.message });
        else {
          send({
            type: "error",
            code: result.error.code,
            message: result.error.message,
            retryable: result.error.retryable && !result.partial,
            partial: result.partial,
          });
        }
      } catch {
        send({ type: "error", code: "storage", message: "Une erreur est survenue. Réessaie.", retryable: true, partial: null });
      } finally {
        releaseGenerationLock(conversation.id);
        if (open) {
          try {
            streamController.close();
          } catch {
            // already closed by the client
          }
        }
      }
    },
    cancel() {
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
