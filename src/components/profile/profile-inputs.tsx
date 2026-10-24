"use client";
import { Check, Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { INTEREST_SUGGESTIONS } from "@/lib/labels";
import { LIMITS } from "@/lib/validation";

/** Accessible single-choice group rendered as selectable cards (native radios). */
export function ChoiceGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
  columns = 1,
}: {
  legend: string;
  options: { value: T; label: string; description?: string }[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 1 | 2;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className={cn("grid gap-2.5", columns === 2 && "sm:grid-cols-2")}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border bg-surface px-4 py-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ring)]",
                checked ? "border-accent bg-accent-soft/50" : "border-border hover:border-border-strong",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  checked ? "border-accent bg-accent" : "border-border-strong",
                )}
              >
                {checked ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              </span>
              <span>
                <span className="block text-[15px] font-medium text-fg">{o.label}</span>
                {o.description ? <span className="mt-0.5 block text-sm text-muted">{o.description}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Multi-select of interests with suggestions and free entries. */
export function InterestPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const full = value.length >= LIMITS.interestsMax;
  const has = (i: string) => value.some((v) => v.toLowerCase() === i.toLowerCase());

  const toggle = (interest: string) => {
    if (has(interest)) onChange(value.filter((v) => v.toLowerCase() !== interest.toLowerCase()));
    else if (!full) onChange([...value, interest]);
  };
  const addDraft = () => {
    const clean = draft.trim().slice(0, LIMITS.interestMaxChars);
    if (clean && !has(clean) && !full) onChange([...value, clean]);
    setDraft("");
  };
  const custom = value.filter((v) => !INTEREST_SUGGESTIONS.some((s) => s.toLowerCase() === v.toLowerCase()));

  return (
    <div>
      <ul className="flex flex-wrap gap-2" aria-label="Suggestions de centres d'intérêt">
        {[...INTEREST_SUGGESTIONS, ...custom].map((interest) => {
          const selected = has(interest);
          return (
            <li key={interest}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(interest)}
                disabled={!selected && full}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors disabled:opacity-40",
                  selected
                    ? "border-accent bg-accent-soft text-accent-text"
                    : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg",
                )}
              >
                {selected ? <Check aria-hidden className="h-3.5 w-3.5" /> : null}
                {interest}
                {selected && custom.includes(interest) ? <X aria-hidden className="h-3.5 w-3.5" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          Ajouter un centre d&apos;intérêt
        </label>
        <input
          id={inputId}
          value={draft}
          maxLength={LIMITS.interestMaxChars}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
          placeholder="Autre sujet…"
          disabled={full}
          className="h-10 min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-3 text-sm placeholder:text-subtle focus:border-accent focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={addDraft}
          disabled={!draft.trim() || full}
          className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-border bg-surface px-3 text-sm text-muted hover:text-fg disabled:opacity-40"
        >
          <Plus aria-hidden className="h-4 w-4" /> Ajouter
        </button>
      </div>
      <p className="mt-2 text-xs text-subtle" aria-live="polite">
        {value.length}/{LIMITS.interestsMax} sélectionnés
      </p>
    </div>
  );
}
