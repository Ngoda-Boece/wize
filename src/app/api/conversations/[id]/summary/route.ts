import { z } from "zod";
import { getChatProvider } from "@/lib/ai";
import { AiError } from "@/lib/ai/provider";
import { generateSummaryDraft, SummaryValidationError } from "@/lib/ai/session-service";
import { getViewer } from "@/lib/auth/viewer";
import { getRepository } from "@/lib/data";
import { isSameOrigin, jsonError } from "@/lib/http";
import { rateLimit, SUMMARY_RATE_LIMIT } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Generates a DRAFT summary. Nothing is stored until the user saves it. */
export async function POST(request: Request, ctx: RouteContext<"/api/conversations/[id]/summary">) {
  if (!isSameOrigin(request)) return jsonError(403, "forbidden", "Origine non autorisée.");
  const viewer = await getViewer();
  if (!viewer) return jsonError(401, "unauthenticated", "Connecte-toi pour continuer.");

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return jsonError(404, "not_found", "Conversation introuvable.");

  const limited = rateLimit(`summary:${viewer.id}`, SUMMARY_RATE_LIMIT.limit, SUMMARY_RATE_LIMIT.windowMs);
  if (!limited.ok) return jsonError(429, "rate_limited", "Trop de synthèses demandées. Patiente un instant.");

  const repo = await getRepository(viewer);
  const conversation = await repo.getConversation(id);
  if (!conversation) return jsonError(404, "not_found", "Conversation introuvable.");

  const messages = await repo.listMessages(id);
  if (messages.filter((m) => m.role === "user").length < 1 || messages.length < 2) {
    return jsonError(422, "too_short", "Échange encore un peu avec Wize avant de générer une synthèse.");
  }

  try {
    const provider = getChatProvider(conversation);
    const summary = await generateSummaryDraft(provider, conversation, messages);
    return Response.json({ summary, simulated: provider.kind === "mock" }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof SummaryValidationError) return jsonError(502, "invalid_output", err.message);
    if (err instanceof AiError) return jsonError(err.code === "config" ? 503 : 502, err.code, err.message);
    return jsonError(500, "internal", "Impossible de générer la synthèse. Réessaie.");
  }
}
