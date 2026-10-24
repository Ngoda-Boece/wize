"use client";
import { ArrowDown, BookCheck, Check, Pencil, RotateCcw, Trash, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ModeIcon } from "@/components/mode-icon";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { deleteConversationAction, updateConversationAction } from "@/lib/actions/app";
import { createEventParser } from "@/lib/chat-protocol";
import { MODE_INFO } from "@/lib/labels";
import { MODES, type Conversation, type Message, type Mode, type SessionSummary } from "@/lib/types";
import { LIMITS } from "@/lib/validation";
import { Composer, type ComposerHandle } from "./composer";
import { MessageBubble } from "./message-bubble";
import { SummaryPanel } from "./summary-panel";

type UiMessage = Message & { pending?: boolean };
type ChatBody = { conversationId: string; message?: string; clientMessageId?: string; retry?: boolean };
type ChatError = { message: string; retryBody: ChatBody | null };

const NEAR_BOTTOM_PX = 140;

function newClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isNearBottom() {
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - NEAR_BOTTOM_PX;
}

export function ChatWorkspace({
  conversation,
  initialMessages,
  initialSummary,
  aiMode,
}: {
  conversation: Conversation;
  initialMessages: Message[];
  initialSummary: SessionSummary | null;
  aiMode: "anthropic" | "mock" | "unconfigured";
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [streamText, setStreamText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [mode, setMode] = useState<Mode>(conversation.mode);
  const [title, setTitle] = useState(conversation.title);
  const [summary, setSummary] = useState(initialSummary);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const streamTextRef = useRef("");
  const stickRef = useRef(true);
  const startedRef = useRef(false);
  const composerRef = useRef<ComposerHandle>(null);

  const simulated = aiMode === "mock";
  const aiAvailable = aiMode !== "unconfigured";

  // ── Scrolling: follow the stream only while the reader is at the bottom ──
  useEffect(() => {
    const onScroll = () => {
      const near = isNearBottom();
      stickRef.current = near;
      setShowJump(!near);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (stickRef.current) window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [messages, streamText, error]);

  const jumpToBottom = () => {
    stickRef.current = true;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  // ── Streaming request ────────────────────────────────────────────────────
  // One request/stream cycle. Returns what should happen next.
  const attempt = useCallback(
    async (body: ChatBody, optimisticId?: string, originalText?: string): Promise<"retry" | "refresh" | null> => {
      if (busyRef.current) return null;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      setStreamText("");
      setAnnouncement("Wize rédige une réponse…");
      streamTextRef.current = "";
      const controller = new AbortController();
      abortRef.current = controller;

      let started = false;
      let finished = false;
      let followUp: "retry" | "refresh" | null = null;

      const keepPartialLocally = () => {
        const text = streamTextRef.current;
        if (!text.trim()) return false;
        setMessages((list) => [
          ...list,
          {
            id: `local-${Date.now()}`,
            conversationId: conversation.id,
            role: "assistant",
            content: text,
            status: "partial",
            mode,
            createdAt: new Date().toISOString(),
          },
        ]);
        return true;
      };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          const code: string | undefined = data?.error?.code;
          const message: string = data?.error?.message ?? "Une erreur est survenue. Réessaie.";
          if (code === "duplicate") {
            // An earlier attempt already stored this message: only the reply is missing.
            setMessages((list) => list.map((m) => (m.id === optimisticId ? { ...m, pending: false } : m)));
            followUp = "retry";
          } else if (code === "nothing_to_retry") {
            followUp = "refresh";
          } else {
            // The message was not stored: give the text back so nothing is lost.
            if (optimisticId) {
              setMessages((list) => list.filter((m) => m.id !== optimisticId));
              if (originalText) composerRef.current?.setText(originalText);
            }
            const retryable = res.status === 429 || res.status >= 500;
            setError({
              message: res.status === 401 ? "Ta session a expiré. Recharge la page pour te reconnecter." : message,
              retryBody: retryable && body.retry ? body : null,
            });
          }
          return followUp;
        }

        const reader = res.body.getReader();
        const parse = createEventParser();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          for (const event of parse(value)) {
            if (event.type === "start") {
              started = true;
              if (event.userMessage && optimisticId) {
                const stored = event.userMessage;
                setMessages((list) => list.map((m) => (m.id === optimisticId ? stored : m)));
              }
            } else if (event.type === "delta") {
              streamTextRef.current += event.text;
              setStreamText(streamTextRef.current);
            } else if (event.type === "done") {
              finished = true;
              setMessages((list) => [...list, event.message]);
              setAnnouncement("Réponse de Wize reçue.");
            } else if (event.type === "error") {
              finished = true;
              if (event.partial) setMessages((list) => [...list, event.partial!]);
              setError({
                message: event.message,
                retryBody: event.retryable ? { conversationId: conversation.id, retry: true } : null,
              });
              setAnnouncement(event.message);
            }
          }
        }
        if (!finished) {
          // Stream closed without a final event (network drop).
          const kept = keepPartialLocally();
          setError({
            message: "La connexion a été interrompue.",
            retryBody: kept ? null : { conversationId: conversation.id, retry: true },
          });
        }
      } catch {
        if (controller.signal.aborted) {
          // Stop button: the server saves what was produced as a partial reply.
          if (!started) {
            // Stopped before the server answered: re-sending with the same key is safe.
            setMessages((list) => list.map((m) => (m.id === optimisticId ? { ...m, pending: false } : m)));
            setError({ message: "Génération arrêtée.", retryBody: body });
          } else if (!keepPartialLocally()) {
            setError({ message: "Génération arrêtée.", retryBody: { conversationId: conversation.id, retry: true } });
          }
          setAnnouncement("Génération arrêtée.");
        } else if (!started) {
          // We don't know whether the message reached the server. Re-sending
          // with the same idempotency key is safe either way.
          setMessages((list) => list.map((m) => (m.id === optimisticId ? { ...m, pending: false } : m)));
          setError({ message: "Connexion impossible. Vérifie ton réseau et réessaie.", retryBody: body });
        } else {
          const kept = keepPartialLocally();
          setError({
            message: "La connexion a été interrompue.",
            retryBody: kept ? null : { conversationId: conversation.id, retry: true },
          });
        }
      } finally {
        busyRef.current = false;
        abortRef.current = null;
        streamTextRef.current = "";
        setStreamText(null);
        setBusy(false);
      }

      return followUp;
    },
    [conversation.id, mode],
  );

  const runChat = useCallback(
    async (body: ChatBody, optimisticId?: string, originalText?: string) => {
      let next = await attempt(body, optimisticId, originalText);
      // "duplicate": the message was stored by an earlier attempt, only the reply is missing.
      if (next === "retry") next = await attempt({ conversationId: conversation.id, retry: true });
      // Server state differs from what we display (e.g. reply already saved): reload it.
      if (next === "refresh") router.refresh();
    },
    [attempt, conversation.id, router],
  );

  const send = useCallback(
    (text: string, clientMessageId = newClientId()): boolean => {
      if (busyRef.current || !aiAvailable || text.length > LIMITS.messageMaxChars) return false;
      const optimisticId = `pending-${clientMessageId}`;
      setMessages((list) => [
        ...list,
        {
          id: optimisticId,
          conversationId: conversation.id,
          role: "user",
          content: text,
          status: "complete",
          mode,
          createdAt: new Date().toISOString(),
          pending: true,
        },
      ]);
      stickRef.current = true;
      void runChat({ conversationId: conversation.id, message: text, clientMessageId }, optimisticId, text);
      return true;
    },
    [aiAvailable, conversation.id, mode, runChat],
  );

  // The first message of a new session is its subject. The fixed idempotency
  // key "initial" guarantees it is stored once, even after a double mount.
  useEffect(() => {
    if (startedRef.current || initialMessages.length > 0 || !aiAvailable) return;
    startedRef.current = true;
    send(conversation.subject, "initial");
  }, [aiAvailable, conversation.subject, initialMessages.length, send]);

  const stop = () => abortRef.current?.abort();

  // ── Header actions ───────────────────────────────────────────────────────
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [headerPending, startHeaderTransition] = useTransition();

  const saveTitle = () => {
    const clean = titleDraft.trim();
    if (!clean || clean === title) {
      setEditingTitle(false);
      setTitleDraft(title);
      return;
    }
    startHeaderTransition(async () => {
      const result = await updateConversationAction(conversation.id, { title: clean });
      if (result.ok) {
        setTitle(result.data.title);
        setEditingTitle(false);
        setHeaderError(null);
      } else setHeaderError(result.error);
    });
  };

  const changeMode = (next: Mode) => {
    if (next === mode) return;
    const previous = mode;
    setMode(next);
    startHeaderTransition(async () => {
      const result = await updateConversationAction(conversation.id, { mode: next });
      if (!result.ok) {
        setMode(previous);
        setHeaderError(result.error);
      } else setHeaderError(null);
    });
  };

  const deleteConversation = () => {
    startHeaderTransition(async () => {
      const result = await deleteConversationAction(conversation.id);
      if (result.ok) router.push("/app/history");
      else setHeaderError(result.error);
    });
  };

  // ── Rendering ────────────────────────────────────────────────────────────
  const userTurns = messages.filter((m) => m.role === "user" && !m.pending).length;
  const assistantTurns = messages.filter((m) => m.role === "assistant").length;
  const canSummarize = userTurns >= 1 && assistantTurns >= 1 && !busy;
  const lastAssistantMode = [...messages].reverse().find((m) => m.role === "assistant")?.mode ?? conversation.mode;

  // A divider marks each point where the assistant replied in a new mode.
  const dividers = new Map<string, Mode>();
  let previousAssistantMode: Mode = conversation.mode;
  for (const m of messages) {
    if (m.role !== "assistant" || !m.mode) continue;
    if (m.mode !== previousAssistantMode) dividers.set(m.id, m.mode);
    previousAssistantMode = m.mode;
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-14 z-20 border-b border-border bg-bg/90 backdrop-blur-md md:top-0">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {editingTitle ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveTitle();
                }}
                className="flex items-center gap-1"
              >
                <label htmlFor="title-input" className="sr-only">
                  Titre de la session
                </label>
                <input
                  id="title-input"
                  value={titleDraft}
                  autoFocus
                  maxLength={LIMITS.titleMaxChars}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setEditingTitle(false);
                      setTitleDraft(title);
                    }
                  }}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-accent bg-surface px-2 text-[15px] font-semibold focus:outline-none"
                />
                <button type="submit" aria-label="Enregistrer le titre" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-accent-text hover:bg-accent-soft">
                  <Check aria-hidden className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Annuler"
                  onClick={() => {
                    setEditingTitle(false);
                    setTitleDraft(title);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-sunken"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <div className="flex min-w-0 items-center gap-1">
                <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1>
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  aria-label="Renommer la session"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-subtle hover:bg-sunken hover:text-fg"
                >
                  <Pencil aria-hidden className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {conversation.subject !== title ? <p className="truncate text-[13px] text-muted">Sujet : {conversation.subject}</p> : null}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="mode-select" className="sr-only">
              Mode d&apos;interaction
            </label>
            <div className="relative flex min-w-0 flex-1 items-center lg:flex-none">
              <ModeIcon mode={mode} className="pointer-events-none absolute left-2.5 h-4 w-4 text-accent-text" />
              <select
                id="mode-select"
                value={mode}
                disabled={busy || headerPending}
                onChange={(e) => changeMode(e.target.value as Mode)}
                className="h-9 w-full min-w-0 appearance-none rounded-[10px] border border-border bg-surface pl-8 pr-8 text-sm font-medium focus:border-accent focus:outline-none disabled:opacity-60 lg:w-44"
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {MODE_INFO[m].label}
                  </option>
                ))}
              </select>
              <span aria-hidden className="pointer-events-none absolute right-3 text-xs text-subtle">
                ▾
              </span>
            </div>
            <Button variant="secondary" size="sm" className="h-9" onClick={() => setSummaryOpen(true)}>
              <BookCheck aria-hidden className={summary ? "h-4 w-4 text-mint-text" : "h-4 w-4"} />
              Synthèse
            </Button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Supprimer la session"
              title="Supprimer la session"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-subtle hover:bg-danger-soft hover:text-danger"
            >
              <Trash aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>
        {headerError ? (
          <p role="alert" className="mx-auto max-w-3xl px-4 pb-2 text-sm text-danger sm:px-6">
            {headerError}
          </p>
        ) : null}
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 pt-6 sm:px-6">
        <div className="mb-8 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          <p className="flex items-center gap-2 font-medium text-fg">
            <ModeIcon mode={conversation.mode} className="h-4 w-4 text-accent-text" />
            Mode {MODE_INFO[conversation.mode].label}
          </p>
          <p className="mt-1 leading-relaxed">{MODE_INFO[conversation.mode].opening}</p>
        </div>

        <ol className="space-y-6" aria-label="Messages de la session">
          {messages.map((m) => {
            const divider = dividers.get(m.id);
            return (
              <Fragment key={m.id}>
                {divider ? <ModeDivider mode={divider} /> : null}
                <li>
                  <MessageBubble
                    role={m.role}
                    content={m.content}
                    partial={m.status === "partial"}
                    pending={m.pending}
                    simulated={simulated && m.role === "assistant"}
                  />
                </li>
              </Fragment>
            );
          })}
          {streamText !== null ? (
            <>
              {mode !== lastAssistantMode ? <ModeDivider mode={mode} /> : null}
              <li aria-busy="true">
                <MessageBubble role="assistant" content={streamText} streaming />
              </li>
            </>
          ) : null}
        </ol>

        {!busy && mode !== lastAssistantMode && messages.length > 0 ? (
          <p className="mt-6 text-center text-xs text-subtle">La prochaine réponse sera en mode {MODE_INFO[mode].label}.</p>
        ) : null}

        {error ? (
          <div className="mt-6">
            <Alert tone="error">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{error.message}</span>
                {error.retryBody ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const retryBody = error.retryBody!;
                      stickRef.current = true;
                      void runChat(retryBody);
                    }}
                  >
                    <RotateCcw aria-hidden className="h-3.5 w-3.5" /> Réessayer
                  </Button>
                ) : null}
              </div>
            </Alert>
          </div>
        ) : null}

        {!aiAvailable ? (
          <Alert tone="warning" className="mt-6">
            Le service d&apos;IA n&apos;est pas configuré sur ce serveur. Tu peux relire tes sessions, mais pas en démarrer de nouvelles réponses.
          </Alert>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-10 bg-gradient-to-t from-bg via-bg to-bg/0 pb-[max(env(safe-area-inset-bottom),12px)] pt-4">
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          {showJump ? (
            <button
              type="button"
              onClick={jumpToBottom}
              className="absolute -top-12 left-1/2 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs text-muted shadow-card hover:text-fg"
            >
              <ArrowDown aria-hidden className="h-3.5 w-3.5" /> Derniers messages
            </button>
          ) : null}
          <Composer
            ref={composerRef}
            busy={busy}
            disabled={!aiAvailable}
            disabledReason="Service d'IA indisponible"
            onSend={(text) => send(text)}
            onStop={stop}
          />
          <p className="mt-2 text-center text-[11px] text-subtle">
            {simulated ? "Réponses simulées (mode démo)." : "Wize peut se tromper : garde ton esprit critique."}
          </p>
        </div>
      </div>

      <p className="sr-only" aria-live="polite" role="status">
        {announcement}
      </p>

      <SummaryPanel
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        conversationId={conversation.id}
        saved={summary}
        onSavedChange={setSummary}
        canGenerate={canSummarize}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteConversation}
        pending={headerPending}
        title="Supprimer cette session ?"
        description="La conversation, ses messages et sa synthèse éventuelle seront supprimés définitivement."
      />
    </div>
  );
}

function ModeDivider({ mode }: { mode: Mode }) {
  return (
    <li aria-label={`Passage en mode ${MODE_INFO[mode].label}`} className="flex items-center gap-3 text-xs text-subtle">
      <span className="h-px flex-1 bg-border" />
      <span className="inline-flex items-center gap-1.5">
        <ModeIcon mode={mode} className="h-3.5 w-3.5" /> Mode {MODE_INFO[mode].label}
      </span>
      <span className="h-px flex-1 bg-border" />
    </li>
  );
}
