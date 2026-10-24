"use client";
import { RotateCcw, Save, Trash } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { deleteSummaryAction, saveSummaryAction } from "@/lib/actions/app";
import { summaryToMarkdown } from "@/lib/summary-format";
import type { SessionSummary, SummaryContent } from "@/lib/types";
import { CopyButton } from "./message-bubble";
import { SummaryView } from "./summary-view";

type Props = {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  saved: SessionSummary | null;
  onSavedChange: (summary: SessionSummary | null) => void;
  canGenerate: boolean;
};

/**
 * Generate → review → save flow. A generated draft is never stored until the
 * user explicitly saves it.
 */
export function SummaryPanel({ open, onClose, conversationId, saved, onSavedChange, canGenerate }: Props) {
  const [draft, setDraft] = useState<{ summary: SummaryContent; simulated: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/summary`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) setError(data?.error?.message ?? "Impossible de générer la synthèse. Réessaie.");
      else setDraft({ summary: data.summary, simulated: !!data.simulated });
    } catch {
      setError("Connexion interrompue. Vérifie ton réseau et réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    if (!draft) return;
    startTransition(async () => {
      const result = await saveSummaryAction(conversationId, draft.summary);
      if (result.ok) {
        onSavedChange(result.data);
        setDraft(null);
        setNotice("Synthèse enregistrée. La session est marquée comme terminée.");
      } else setError(result.error);
    });
  };

  const remove = () => {
    if (!saved) return;
    startTransition(async () => {
      const result = await deleteSummaryAction(saved.id);
      if (result.ok) {
        onSavedChange(null);
        setConfirmDelete(false);
        setNotice("Synthèse supprimée.");
      } else setError(result.error);
    });
  };

  const shown = draft?.summary ?? saved?.summary ?? null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Synthèse de la session"
      description="Une synthèse fidèle à votre échange : elle n'ajoute aucune conclusion que tu n'as pas atteinte."
    >
      <div className="space-y-4">
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted" aria-live="polite">
            <Spinner label="Génération en cours" /> Wize relit votre échange…
          </div>
        ) : shown ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {draft ? <Badge tone="warning">Brouillon non enregistré</Badge> : <Badge tone="mint">Enregistrée</Badge>}
              {draft?.simulated ? <Badge>Synthèse simulée</Badge> : null}
            </div>
            <h3 className="text-lg font-semibold tracking-tight">{shown.title}</h3>
            <SummaryView summary={shown} />
          </>
        ) : (
          <p className="py-6 text-sm leading-relaxed text-muted">
            {canGenerate
              ? "Génère une synthèse pour consolider ce que tu as exploré : concepts clés, arguments, questions ouvertes et un exercice pour vérifier ta compréhension."
              : "Échange encore un peu avec Wize avant de générer une synthèse."}
          </p>
        )}

        {confirmDelete ? (
          <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm">
            <p className="text-danger">Supprimer définitivement cette synthèse ?</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="danger" onClick={remove} disabled={pending}>
                Supprimer
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)} disabled={pending}>
                Annuler
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1">
            {shown ? <CopyButton text={summaryToMarkdown(shown)} label="Copier la synthèse" /> : null}
            {saved && !draft ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs text-subtle hover:bg-danger-soft hover:text-danger"
              >
                <Trash aria-hidden className="h-3.5 w-3.5" /> Supprimer
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {canGenerate ? (
              <Button variant={draft ? "secondary" : shown ? "secondary" : "primary"} onClick={generate} disabled={loading || pending}>
                <RotateCcw aria-hidden className="h-4 w-4" />
                {shown ? "Régénérer" : "Générer la synthèse"}
              </Button>
            ) : null}
            {draft ? (
              <Button onClick={save} disabled={pending || loading}>
                <Save aria-hidden className="h-4 w-4" />
                {pending ? "Enregistrement…" : saved ? "Remplacer la synthèse" : "Enregistrer"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
