"use client";
import { ArrowUp, Square } from "lucide-react";
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { LIMITS } from "@/lib/validation";

export type ComposerHandle = { focus: () => void; setText: (text: string) => void };

/**
 * Message input. Enter sends, Shift+Enter adds a newline. While a reply is
 * streaming the user can keep typing; the send button becomes a stop button.
 */
export const Composer = forwardRef<
  ComposerHandle,
  { busy: boolean; disabled?: boolean; disabledReason?: string; onSend: (text: string) => boolean; onStop: () => void }
>(function Composer({ busy, disabled = false, disabledReason, onSend, onStop }, ref) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    setText: (value: string) => {
      setText(value);
      textareaRef.current?.focus();
    },
  }));

  // Grow with content up to a max height.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  const tooLong = text.length > LIMITS.messageMaxChars;
  const canSend = !busy && !disabled && text.trim().length > 0 && !tooLong;

  const send = () => {
    if (!canSend) return;
    if (onSend(text.trim())) setText("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="rounded-2xl border border-border bg-surface shadow-card transition-shadow focus-within:border-accent focus-within:ring-3 focus-within:ring-[var(--ring)]"
    >
      <label htmlFor="composer" className="sr-only">
        Ton message
      </label>
      <textarea
        id="composer"
        ref={textareaRef}
        value={text}
        rows={1}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={disabled ? disabledReason : "Réponds, argumente, pose une question…"}
        aria-describedby="composer-hint"
        className="block max-h-[220px] w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[15px] leading-relaxed placeholder:text-subtle focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed"
      />
      <div className="flex items-center justify-between gap-3 px-3 pb-2.5 pt-1">
        <p id="composer-hint" className={cn("pl-1 text-xs", tooLong ? "text-danger" : "text-subtle")}>
          {tooLong ? (
            `Message trop long (${text.length}/${LIMITS.messageMaxChars})`
          ) : busy ? (
            "Wize répond… Tu pourras envoyer ton message dès la fin de la réponse."
          ) : (
            <span className="hidden sm:inline">Entrée pour envoyer · Maj+Entrée pour aller à la ligne</span>
          )}
        </p>
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Arrêter la génération"
            title="Arrêter la génération"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-fg text-bg transition-opacity hover:opacity-85"
          >
            <Square aria-hidden className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Envoyer"
            title="Envoyer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-fg transition-colors hover:bg-accent-hover disabled:bg-sunken disabled:text-subtle"
          >
            <ArrowUp aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
});
