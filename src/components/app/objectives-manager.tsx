"use client";
import { Plus, Target, Trash } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { createObjectiveAction, deleteObjectiveAction, setObjectiveStatusAction } from "@/lib/actions/app";
import { OBJECTIVE_KIND_LABELS, OBJECTIVE_STATUS_LABELS } from "@/lib/labels";
import { OBJECTIVE_KINDS, OBJECTIVE_STATUSES, type Objective, type ObjectiveKind, type ObjectiveStatus } from "@/lib/types";
import { LIMITS } from "@/lib/validation";

const STATUS_TONE: Record<ObjectiveStatus, "neutral" | "accent" | "mint"> = {
  not_started: "neutral",
  in_progress: "accent",
  completed: "mint",
};

/** Objectives change status only through an explicit user action. */
export function ObjectivesManager({ initial }: { initial: Objective[] }) {
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<ObjectiveKind>("understand");
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const create = () => {
    startTransition(async () => {
      const result = await createObjectiveAction({ title, description, kind });
      if (result.ok) {
        setItems((list) => [result.data, ...list]);
        setOpen(false);
        setTitle("");
        setDescription("");
        setError(null);
      } else setError(result.error);
    });
  };

  const setStatus = (id: string, status: ObjectiveStatus) => {
    startTransition(async () => {
      const result = await setObjectiveStatusAction(id, status);
      if (result.ok) setItems((list) => list.map((o) => (o.id === id ? result.data : o)));
      else setRowError(result.error);
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const result = await deleteObjectiveAction(id);
      if (result.ok) setItems((list) => list.filter((o) => o.id !== id));
      else setRowError(result.error);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="objectives-title" className="text-[15px] font-semibold tracking-tight">
          Objectifs d&apos;apprentissage
        </h2>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <Plus aria-hidden className="h-4 w-4" /> Nouvel objectif
        </Button>
      </div>
      {rowError ? <Alert tone="error">{rowError}</Alert> : null}
      {items.length ? (
        <ul className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface shadow-soft" aria-labelledby="objectives-title">
          {items.map((o) => (
            <li key={o.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{o.title}</span>
                  <Badge tone={STATUS_TONE[o.status]}>{OBJECTIVE_STATUS_LABELS[o.status]}</Badge>
                </p>
                <p className="mt-0.5 text-xs text-subtle">{OBJECTIVE_KIND_LABELS[o.kind]}</p>
                {o.description ? <p className="mt-1 text-sm text-muted">{o.description}</p> : null}
              </div>
              <div className="flex items-center gap-1.5">
                <label htmlFor={`status-${o.id}`} className="sr-only">
                  Statut de « {o.title} »
                </label>
                <select
                  id={`status-${o.id}`}
                  value={o.status}
                  disabled={pending}
                  onChange={(e) => setStatus(o.id, e.target.value as ObjectiveStatus)}
                  className="h-9 rounded-lg border border-border bg-surface px-2 text-sm focus:border-accent focus:outline-none"
                >
                  {OBJECTIVE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {OBJECTIVE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(o.id)}
                  aria-label={`Supprimer l'objectif « ${o.title} »`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-subtle hover:bg-danger-soft hover:text-danger"
                >
                  <Trash aria-hidden className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface/60 p-5 text-sm text-muted">
          <Target aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" />
          <p>Fixe-toi un objectif concret (comprendre un sujet, préparer une décision…) et rattache-le à tes sessions pour suivre où tu en es.</p>
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Nouvel objectif" description="Un objectif clair aide à orienter tes sessions.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          className="space-y-4"
        >
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Field label="Type d'objectif" htmlFor="objective-kind">
            <Select id="objective-kind" value={kind} onChange={(e) => setKind(e.target.value as ObjectiveKind)}>
              {OBJECTIVE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {OBJECTIVE_KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Intitulé" htmlFor="objective-title">
            <Input
              id="objective-title"
              required
              value={title}
              maxLength={LIMITS.titleMaxChars}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. : Comprendre les bases de la politique monétaire"
            />
          </Field>
          <Field label="Précisions (facultatif)" htmlFor="objective-description">
            <Textarea
              id="objective-description"
              rows={3}
              value={description}
              maxLength={LIMITS.objectiveDescriptionMaxChars}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending ? "Création…" : "Créer l'objectif"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
