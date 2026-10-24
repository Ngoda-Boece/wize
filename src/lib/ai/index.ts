import "server-only";
import { aiConfig } from "@/lib/env";
import type { Mode } from "@/lib/types";
import { AnthropicProvider } from "./anthropic";
import { MockProvider } from "./mock";
import { aiError, type ChatProvider } from "./provider";

/** Returns the configured provider, or throws an AiError("config") when none is available. */
export function getChatProvider(session: { mode: Mode; subject: string }): ChatProvider {
  const config = aiConfig();
  if (config.kind === "anthropic") {
    return new AnthropicProvider(config.apiKey, config.model, config.effort, config.refusalFallback);
  }
  if (config.kind === "mock") return new MockProvider(session.mode, session.subject);
  throw aiError("config");
}

export function aiStatus(): "anthropic" | "mock" | "unconfigured" {
  return aiConfig().kind;
}
