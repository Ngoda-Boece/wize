"use client";
import { ArrowRight, BookCheck, Trash } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { SummaryView } from "@/components/chat/summary-view";
import { CopyButton } from "@/components/chat/message-bubble";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { deleteSummaryAction } from "@/lib/actions/app";
import { formatDate } from "@/lib/labels";
import { summaryToMarkdown } from "@/lib/summary-format";
import type { SessionSummary } from "@/lib/types";

export function SavedSummaries({ initial }: { initial: SessionSummary[] }) {
  const [items, setItems] = useState(initial);
  const [viewing, setViewing] = useState<SessionSummary | null>(null);
  const [deleting, setDeleting] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteSummaryAction(deleting.id);
      if (result.ok) {
        setItems((list) => list.filter((s) => s.id !== deleting.id));
        setDeleting(null);
        setError(null);
      } else setError(result.error);
    });
  };

  if (!items.length) {
    return (
      <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface/60 p-5 text-sm text-muted">
        <BookCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" />
        <p>Aucune synthèse enregistrée. Dans une session, clique sur « Synthèse » pour consolider ce que tu as exploré.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((s) => (
          <li key={s.id} className="flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-soft">
            <p className="text-xs text-subtle">{formatDate(s.createdAt)}</p>
            <h3 className="mt-1 line-clamp-2 font-medium">{s.conversationTitle}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{s.summary.centralQuestion}</p>
            <div className="mt-auto flex items-center justify-between pt-3">
              <button type="button" onClick={() => setViewing(s)} className="text-sm font-medium text-accent-text hover:underline">
                Relire la synthèse
              </button>
              <div className="flex items-center gap-0.5">
                <Link
                  href={`/app/chat/${s.conversationId}`}
                  aria-label={`Reprendre la session « ${s.conversationTitle} »`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-subtle hover:bg-sunken hover:text-fg"
                >
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleting(s)}
                  aria-label={`Supprimer la synthèse « ${s.conversationTitle} »`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-subtle hover:bg-danger-soft hover:text-danger"
                >
                  <Trash aria-hidden className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {error && !deleting ? <Alert tone="error">{error}</Alert> : null}
      <Dialog open={!!viewing} onClose={() => setViewing(null)} size="lg" title={viewing?.summary.title ?? "Synthèse"}>
        {viewing ? (
          <div className="space-y-4">
            <SummaryView summary={viewing.summary} />
            <div className="flex justify-between border-t border-border pt-3">
              <CopyButton text={summaryToMarkdown(viewing.summary)} label="Copier la synthèse" />
              <Link href={`/app/chat/${viewing.conversationId}`} className="inline-flex items-center gap-1 text-sm text-accent-text hover:underline">
                Reprendre la session <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : null}
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        pending={pending}
        error={error}
        title="Supprimer cette synthèse ?"
        description="La conversation est conservée ; seule la synthèse est supprimée."
      />
    </>
  );
}
