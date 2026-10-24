"use client";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { ModeIcon } from "@/components/mode-icon";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { startSessionAction } from "@/lib/actions/app";
import { cn } from "@/lib/cn";
import { MODE_INFO } from "@/lib/labels";
import { MODES, type Mode, type Objective } from "@/lib/types";
import { LIMITS } from "@/lib/validation";

export function StartSessionForm({
  defaultMode,
  suggestions,
  objectives,
  autoFocus = false,
  showModeDetails = false,
}: {
  defaultMode: Mode;
  suggestions: string[];
  objectives: Pick<Objective, "id" | "title">[];
  autoFocus?: boolean;
  showModeDetails?: boolean;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [objectiveId, setObjectiveId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const subjectId = useId();
  const modeName = useId();

  const submit = () => {
    if (pending) return;
    if (!subject.trim()) {
      setError("Écris un sujet ou une question pour commencer.");
      textareaRef.current?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await startSessionAction({ subject, mode, objectiveId: objectiveId || null });
      if (result.ok) router.push(`/app/chat/${result.data.id}`);
      else setError(result.error);
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-[var(--radius-card)] border border-border bg-surface shadow-soft"
    >
      <div className="p-4 sm:p-5">
        <label htmlFor={subjectId} className="text-[15px] font-semibold tracking-tight">
          Sur quoi veux-tu réfléchir aujourd&apos;hui ?
        </label>
        <textarea
          id={subjectId}
          ref={textareaRef}
          value={subject}
          autoFocus={autoFocus}
          onChange={(e) => setSubject(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          maxLength={LIMITS.subjectMaxChars}
          rows={3}
          placeholder="Un sujet, une question, une conviction à tester…"
          aria-invalid={!!error}
          aria-describedby={error ? `${subjectId}-error` : undefined}
          className="mt-3 w-full resize-none rounded-[10px] border border-border bg-surface-2 px-3.5 py-3 text-[15px] leading-relaxed placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-3 focus:ring-[var(--ring)]"
        />
        {suggestions.length ? (
          <div className="mt-3">
            <p className="mb-2 text-xs text-subtle">Pistes (modifiables) :</p>
            <ul className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      setSubject(s);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left text-[13px] text-muted transition-colors hover:border-border-strong hover:text-fg"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <fieldset className="border-t border-border p-4 sm:p-5">
        <legend className="sr-only">Mode d&apos;interaction</legend>
        <p aria-hidden className="mb-3 text-sm font-medium">
          Mode d&apos;interaction
        </p>
        <div className={cn("grid gap-2", showModeDetails ? "sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-4")}>
          {MODES.map((m) => {
            const info = MODE_INFO[m];
            const checked = mode === m;
            return (
              <label
                key={m}
                className={cn(
                  "flex cursor-pointer gap-2.5 rounded-xl border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ring)]",
                  checked ? "border-accent bg-accent-soft/60" : "border-border hover:border-border-strong",
                  showModeDetails ? "items-start" : "items-center",
                )}
              >
                <input type="radio" name={modeName} value={m} checked={checked} onChange={() => setMode(m)} className="sr-only" />
                <ModeIcon mode={m} className={cn("h-4 w-4 shrink-0", checked ? "text-accent-text" : "text-subtle", showModeDetails && "mt-0.5")} />
                <span className="min-w-0">
                  <span className={cn("block text-sm font-medium", checked ? "text-accent-text" : "text-fg")}>{info.label}</span>
                  {showModeDetails ? (
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted">{info.description}</span>
                  ) : (
                    <span className="hidden truncate text-xs text-subtle sm:block">{info.tagline}</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        {objectives.length ? (
          <label className="flex min-w-0 items-center gap-2 text-sm text-muted">
            <span className="shrink-0">Objectif lié</span>
            <select
              value={objectiveId}
              onChange={(e) => setObjectiveId(e.target.value)}
              className="h-9 min-w-0 flex-1 truncate rounded-lg border border-border bg-surface px-2 text-sm text-fg focus:border-accent focus:outline-none sm:max-w-64"
            >
              <option value="">Aucun</option>
              {objectives.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="hidden sm:block" />
        )}
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Préparation…" : "Commencer la session"}
          {!pending ? <ArrowRight aria-hidden className="h-4 w-4" /> : null}
        </Button>
      </div>
      {error ? (
        <div className="px-4 pb-4 sm:px-5" id={`${subjectId}-error`}>
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}
    </form>
  );
}
