import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { aiError, AiError, type ChatProvider, type StreamParams } from "./provider";

// Loose shape for the structured-output request: length and count limits are
// enforced afterwards by `summarySchema`, which also guards stored data.
const summaryOutputSchema = z.object({
  title: z.string(),
  subject: z.string(),
  centralQuestion: z.string(),
  keyConcepts: z.array(z.string()),
  initialHypothesis: z.string().nullable(),
  arguments: z.array(z.string()),
  counterArguments: z.array(z.string()),
  misconceptionsClarified: z.array(z.string()),
  openQuestions: z.array(z.string()),
  takeaways: z.array(z.string()),
  nextSteps: z.array(z.string()),
  exercise: z.string(),
});

// Models that accept the server-side refusal fallback (`fallbacks: "default"`).
const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

/** Maps SDK errors to user-safe errors. Provider messages are never forwarded to the browser. */
export function mapAnthropicError(err: unknown, signal?: AbortSignal): AiError {
  if (err instanceof AiError) return err;
  if (signal?.aborted || err instanceof Anthropic.APIUserAbortError) return aiError("aborted");
  if (err instanceof Anthropic.APIConnectionTimeoutError) return aiError("timeout");
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return aiError("config");
  }
  if (err instanceof Anthropic.RateLimitError) return aiError("rate_limited");
  if (err instanceof Anthropic.InternalServerError) return aiError("overloaded");
  return aiError("provider");
}

export class AnthropicProvider implements ChatProvider {
  readonly kind = "anthropic" as const;
  private client: Anthropic;

  constructor(
    apiKey: string,
    private model: string,
    private effort: "low" | "medium" | "high",
    private refusalFallback: boolean,
  ) {
    // The SDK retries 408/409/429/5xx and connection errors twice by default.
    this.client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 2 });
  }

  async streamReply({ system, messages, signal, onText }: StreamParams) {
    const useFallback = this.refusalFallback && FALLBACK_MODELS.has(this.model);
    try {
      const stream = this.client.beta.messages.stream(
        {
          model: this.model,
          max_tokens: 4096,
          system,
          messages,
          output_config: { effort: this.effort },
          ...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
        },
        { signal },
      );
      stream.on("text", (delta) => onText(delta));
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") throw aiError("refused");
      return { stopReason: final.stop_reason };
    } catch (err) {
      throw mapAnthropicError(err, signal);
    }
  }

  async generateSummary({ system, transcript, signal }: { system: string; transcript: string; signal?: AbortSignal }) {
    try {
      const response = await this.client.messages.parse(
        {
          model: this.model,
          max_tokens: 4096,
          system,
          output_config: { effort: "low", format: zodOutputFormat(summaryOutputSchema) },
          messages: [{ role: "user", content: `<transcript>\n${transcript}\n</transcript>` }],
        },
        { signal },
      );
      if (response.stop_reason === "refusal") throw aiError("refused");
      return response.parsed_output;
    } catch (err) {
      throw mapAnthropicError(err, signal);
    }
  }
}
