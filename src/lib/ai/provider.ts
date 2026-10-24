// Provider-agnostic interface for the AI backend. Routes depend on this, not
// on a specific SDK, so the mock and Anthropic implementations are swappable.

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type StreamParams = {
  system: string;
  messages: ChatTurn[];
  signal: AbortSignal;
  onText: (delta: string) => void;
};

export type StreamResult = {
  /** "end_turn" | "max_tokens" | "refusal" | … (provider specific, informational). */
  stopReason: string | null;
};

export interface ChatProvider {
  /** "anthropic" replies come from Claude; "mock" replies are simulated and labelled as such in the UI. */
  readonly kind: "anthropic" | "mock";
  streamReply(params: StreamParams): Promise<StreamResult>;
  /** Returns the raw structured summary; callers validate it with Zod. */
  generateSummary(params: { system: string; transcript: string; signal?: AbortSignal }): Promise<unknown>;
}

export type AiErrorCode = "rate_limited" | "overloaded" | "refused" | "aborted" | "timeout" | "config" | "provider";

/** Error safe to show to users: the message never contains provider internals. */
export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
    public retryable: boolean,
  ) {
    super(message);
  }
}

export const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  rate_limited: "Wize reçoit beaucoup de demandes. Réessaie dans quelques instants.",
  overloaded: "Le service d'IA est momentanément surchargé. Réessaie dans un instant.",
  refused: "Cette demande n'a pas pu être traitée. Essaie de la reformuler.",
  aborted: "La génération a été interrompue.",
  timeout: "La réponse a pris trop de temps. Réessaie.",
  config: "Le service d'IA n'est pas configuré sur ce serveur.",
  provider: "Le service d'IA a rencontré une erreur. Réessaie.",
};

export function aiError(code: AiErrorCode): AiError {
  const retryable = code !== "config" && code !== "refused";
  return new AiError(code, AI_ERROR_MESSAGES[code], retryable);
}
