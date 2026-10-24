"use client";
import { Check, Copy } from "lucide-react";
import { memo, useState } from "react";
import { LogoMark } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { Markdown } from "./markdown";

export function CopyButton({ text, label = "Copier le message" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // Clipboard unavailable (insecure context or permission denied).
        }
      }}
      aria-label={copied ? "Copié" : label}
      title={copied ? "Copié" : label}
      className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs text-subtle transition-colors hover:bg-sunken hover:text-fg"
    >
      {copied ? <Check aria-hidden className="h-3.5 w-3.5 text-mint-text" /> : <Copy aria-hidden className="h-3.5 w-3.5" />}
      <span aria-live="polite">{copied ? "Copié" : ""}</span>
    </button>
  );
}

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  partial = false,
  streaming = false,
  simulated = false,
  pending = false,
}: {
  role: "user" | "assistant";
  content: string;
  partial?: boolean;
  streaming?: boolean;
  simulated?: boolean;
  pending?: boolean;
}) {
  if (role === "user") {
    return (
      <div className="group flex flex-col items-end">
        <div
          className={cn(
            "max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-accent-soft px-4 py-2.5 text-[15px] leading-relaxed text-fg sm:max-w-[75%]",
            pending && "opacity-70",
          )}
        >
          <span className="sr-only">Toi : </span>
          {content}
        </div>
        <div className="mt-1 h-7 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <CopyButton text={content} />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3">
      <LogoMark className="mt-0.5 h-6 w-6 shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="sr-only">Wize : </span>
        {content ? (
          <div className={cn("prose-wize", streaming && "wize-caret")}>
            <Markdown text={content} />
          </div>
        ) : (
          <p className="flex items-center gap-1.5 pt-1 text-sm text-subtle">
            <span className="inline-flex gap-1" aria-hidden>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
            </span>
            Wize réfléchit…
          </p>
        )}
        {!streaming && content ? (
          <div className="mt-1.5 flex h-7 items-center gap-2">
            {partial ? <Badge tone="warning">Réponse interrompue</Badge> : null}
            {simulated ? <Badge>Réponse simulée</Badge> : null}
            <span className="opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              <CopyButton text={content} />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
});
