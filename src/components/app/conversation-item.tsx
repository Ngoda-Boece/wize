"use client";
import { Check, Pencil, Target, Trash, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ModeIcon } from "@/components/mode-icon";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { deleteConversationAction, updateConversationAction } from "@/lib/actions/app";
import { formatRelative, MODE_INFO } from "@/lib/labels";
import type { Conversation } from "@/lib/types";
import { LIMITS } from "@/lib/validation";

/** One row of a conversation list, with rename and delete actions. */
export function ConversationItem({
  conversation,
  objectiveTitle,
  onDeleted,
  onRenamed,
  allowRename = true,
}: {
  conversation: Conversation;
  objectiveTitle?: string | null;
  onDeleted?: (id: string) => void;
  onRenamed?: (c: Conversation) => void;
  allowRename?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rename = () => {
    const clean = title.trim();
    if (!clean || clean === conversation.title) {
      setEditing(false);
      setTitle(conversation.title);
      return;
    }
    startTransition(async () => {
      const result = await updateConversationAction(conversation.id, { title: clean });
      if (result.ok) {
        setEditing(false);
        setError(null);
        onRenamed?.(result.data);
      } else setError(result.error);
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteConversationAction(conversation.id);
      if (result.ok) {
        setConfirmOpen(false);
        onDeleted?.(conversation.id);
      } else setError(result.error);
    });
  };

  return (
    <li className="group relative flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:px-5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunken text-muted">
        <ModeIcon mode={conversation.mode} />
      </span>
      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              rename();
            }}
            className="flex items-center gap-1.5"
          >
            <label htmlFor={`rename-${conversation.id}`} className="sr-only">
              Nouveau titre
            </label>
            <input
              id={`rename-${conversation.id}`}
              value={title}
              autoFocus
              maxLength={LIMITS.titleMaxChars}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditing(false);
                  setTitle(conversation.title);
                }
              }}
              className="h-8 min-w-0 flex-1 rounded-lg border border-accent bg-surface px-2 text-sm focus:outline-none"
            />
            <button type="submit" disabled={pending} aria-label="Enregistrer le titre" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-accent-text hover:bg-accent-soft">
              <Check aria-hidden className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Annuler"
              onClick={() => {
                setEditing(false);
                setTitle(conversation.title);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-sunken"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <Link
            href={`/app/chat/${conversation.id}`}
            className="block truncate text-[15px] font-medium text-fg after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-[var(--ring)]"
          >
            {conversation.title}
          </Link>
        )}
        {conversation.subject !== conversation.title ? (
          <p className="mt-0.5 truncate text-sm text-muted">{conversation.subject}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
          <span>{MODE_INFO[conversation.mode].label}</span>
          <time dateTime={conversation.updatedAt} suppressHydrationWarning>
            {formatRelative(conversation.updatedAt)}
          </time>
          {conversation.status === "completed" ? <Badge tone="mint">Synthèse enregistrée</Badge> : null}
          {objectiveTitle ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <Target aria-hidden className="h-3 w-3 shrink-0" />
              <span className="truncate">{objectiveTitle}</span>
            </span>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
      {!editing ? (
        <div className="relative z-10 flex shrink-0 gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          {allowRename ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Renommer « ${conversation.title} »`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-subtle hover:bg-sunken hover:text-fg"
            >
              <Pencil aria-hidden className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label={`Supprimer « ${conversation.title} »`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-subtle hover:bg-danger-soft hover:text-danger"
          >
            <Trash aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={remove}
        pending={pending}
        error={confirmOpen ? error : null}
        title="Supprimer cette conversation ?"
        description={`« ${conversation.title} » sera supprimée définitivement, avec ses messages et sa synthèse éventuelle.`}
      />
    </li>
  );
}
