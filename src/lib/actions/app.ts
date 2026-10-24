"use server";

// Server Actions for authenticated features. Each one derives the user from
// the server session, validates its input with Zod and goes through the
// user-scoped repository. Next.js checks the Origin of Server Action requests,
// which protects them against CSRF.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { summarySchema } from "@/lib/ai/schemas";
import { getViewer, type Viewer } from "@/lib/auth/viewer";
import { getRepository, titleFromSubject } from "@/lib/data";
import type { Conversation, Objective, SessionSummary } from "@/lib/types";
import {
  conversationPatchSchema,
  newConversationSchema,
  objectiveCreateSchema,
  objectiveStatusSchema,
  profileSchema,
  type ProfileInput,
} from "@/lib/validation";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const GENERIC_ERROR = "Une erreur est survenue. Réessaie.";
const uuid = z.uuid();

async function withViewer<T>(fn: (viewer: Viewer) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Ta session a expiré. Reconnecte-toi." };
  try {
    return await fn(viewer);
  } catch (err) {
    console.error("[wize] action failed:", err instanceof Error ? err.message : "unknown error");
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ─── Sessions ──────────────────────────────────────────────────────────────

export async function startSessionAction(input: {
  subject: string;
  mode: string;
  objectiveId?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = newConversationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Indique un sujet (500 caractères maximum) et un mode." };
  return withViewer(async (viewer) => {
    const repo = await getRepository(viewer);
    const conversation = await repo.createConversation({
      title: titleFromSubject(parsed.data.subject),
      subject: parsed.data.subject,
      mode: parsed.data.mode,
      objectiveId: parsed.data.objectiveId ?? null,
    });
    revalidatePath("/app", "layout");
    return { ok: true, data: { id: conversation.id } };
  });
}

export async function updateConversationAction(
  id: string,
  patch: { title?: string; mode?: string },
): Promise<ActionResult<Conversation>> {
  const parsed = conversationPatchSchema.safeParse(patch);
  if (!uuid.safeParse(id).success || !parsed.success) return { ok: false, error: "Modification invalide." };
  return withViewer(async (viewer) => {
    const repo = await getRepository(viewer);
    const updated = await repo.updateConversation(id, parsed.data);
    if (!updated) return { ok: false, error: "Conversation introuvable." };
    revalidatePath("/app", "layout");
    return { ok: true, data: updated };
  });
}

export async function deleteConversationAction(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Conversation introuvable." };
  return withViewer(async (viewer) => {
    const repo = await getRepository(viewer);
    const deleted = await repo.deleteConversation(id);
    if (!deleted) return { ok: false, error: "Conversation introuvable." };
    revalidatePath("/app", "layout");
    return { ok: true, data: undefined };
  });
}

export async function listConversationsAction(opts: {
  query?: string;
  offset: number;
}): Promise<ActionResult<{ items: Conversation[]; hasMore: boolean }>> {
  const parsed = z
    .object({ query: z.string().max(100).optional(), offset: z.number().int().min(0).max(10_000) })
    .safeParse(opts);
  if (!parsed.success) return { ok: false, error: "Recherche invalide." };
  return withViewer(async (viewer) => {
    const repo = await getRepository(viewer);
    const page = await repo.listConversations({ query: parsed.data.query, offset: parsed.data.offset, limit: 20 });
    return { ok: true, data: page };
  });
}

// ─── Summaries ─────────────────────────────────────────────────────────────

export async function saveSummaryAction(conversationId: string, summary: unknown): Promise<ActionResult<SessionSummary>> {
  const parsed = summarySchema.safeParse(summary);
  if (!uuid.safeParse(conversationId).success || !parsed.success) {
    return { ok: false, error: "La synthèse n'a pas un format valide." };
  }
  return withViewer(async (viewer) => {
    const repo = await getRepository(viewer);
    const conversation = await repo.getConversation(conversationId);
    if (!conversation) return { ok: false, error: "Conversation introuvable." };
    const saved = await repo.saveSummary(conversationId, parsed.data);
    // Saving a summary is the explicit user action that completes a session.
    await repo.updateConversation(conversationId, { status: "completed" });
    revalidatePath("/app", "layout");
    return { ok: true, data: saved };
  });
}

export async function deleteSummaryAction(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Synthèse introuvable." };
  return withViewer(async (viewer) => {
    const repo = await getRepository(viewer);
    if (!(await repo.deleteSummary(id))) return { ok: false, error: "Synthèse introuvable." };
    revalidatePath("/app", "layout");
    return { ok: true, data: undefined };
  });
}

// ─── Objectives ────────────────────────────────────────────────────────────

export async function createObjectiveAction(input: {
  title: string;
  description?: string;
  kind: string;
}): Promise<ActionResult<Objective>> {
  const parsed = objectiveCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Donne un titre à ton objectif (160 caractères maximum)." };
  return withViewer(async (viewer) => {
    const repo = await getRepository(viewer);
    const objective = await repo.createObjective(parsed.data);
    revalidatePath("/app", "layout");
    return { ok: true, data: objective };
  });
}

export async function setObjectiveStatusAction(id: string, status: string): Promise<ActionResult<Objective>> {
  const parsed = objectiveStatusSchema.safeParse(status);
  if (!uuid.safeParse(id).success || !parsed.success) return { ok: false, error: "Statut invalide." };
  return withViewer(async (viewer) => {
    const repo = await getRepository(viewer);
    const objective = await repo.setObjectiveStatus(id, parsed.data);
    if (!objective) return { ok: false, error: "Objectif introuvable." };
    revalidatePath("/app", "layout");
    return { ok: true, data: objective };
  });
}

export async function deleteObjectiveAction(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Objectif introuvable." };
  return withViewer(async (viewer) => {
    const repo = await getRepository(viewer);
    if (!(await repo.deleteObjective(id))) return { ok: false, error: "Objectif introuvable." };
    revalidatePath("/app", "layout");
    return { ok: true, data: undefined };
  });
}

// ─── Profile & privacy ─────────────────────────────────────────────────────

export async function saveProfileAction(
  input: ProfileInput,
  opts: { completeOnboarding?: boolean } = {},
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Certaines informations ne sont pas valides." };
  return withViewer(async (viewer) => {
    const repo = await getRepository(viewer);
    await repo.saveProfile({
      ...parsed.data,
      ...(opts.completeOnboarding ? { onboardingCompleted: true } : {}),
    });
    revalidatePath("/app", "layout");
    return { ok: true, data: undefined };
  });
}

export async function deleteAllDataAction(): Promise<ActionResult> {
  return withViewer(async (viewer) => {
    const repo = await getRepository(viewer);
    await repo.deleteAllData();
    revalidatePath("/app", "layout");
    return { ok: true, data: undefined };
  });
}

