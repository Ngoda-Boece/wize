import { randomUUID } from "node:crypto";
import type { ChatDeps } from "@/lib/chat-handler";
import { DemoRepository } from "@/lib/data/demo-repository";
import { aiError, type ChatProvider, type StreamParams } from "@/lib/ai/provider";
import type { ChatStreamEvent } from "@/lib/chat-protocol";

export const ORIGIN = "http://localhost:3000";

export function newUser() {
  const id = randomUUID();
  return { id, repo: new DemoRepository(id) };
}

export function chatRequest(body: unknown, init: { origin?: string | null; signal?: AbortSignal } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", host: "localhost:3000" };
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  return new Request(`${ORIGIN}/api/chat`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
    signal: init.signal,
  });
}

/** Scriptable provider for tests. */
export class FakeProvider implements ChatProvider {
  readonly kind = "anthropic" as const;
  calls: StreamParams[] = [];
  constructor(
    private behaviour: { chunks?: string[]; failAfter?: number; failWith?: Parameters<typeof aiError>[0]; waitForAbort?: boolean } = {},
  ) {}

  async streamReply(params: StreamParams) {
    this.calls.push(params);
    const chunks = this.behaviour.chunks ?? ["Bonjour ", "toi."];
    for (let i = 0; i < chunks.length; i++) {
      if (this.behaviour.failAfter === i) throw aiError(this.behaviour.failWith ?? "provider");
      params.onText(chunks[i]!);
    }
    if (this.behaviour.failAfter === chunks.length) throw aiError(this.behaviour.failWith ?? "provider");
    if (this.behaviour.waitForAbort) {
      await new Promise<void>((_, reject) => {
        params.signal.addEventListener("abort", () => reject(aiError("aborted")), { once: true });
      });
    }
    return { stopReason: "end_turn" };
  }

  async generateSummary() {
    return {};
  }
}

export function deps(user: { id: string; repo: DemoRepository } | null, provider: ChatProvider | (() => never)): ChatDeps {
  return {
    getViewerId: async () => user?.id ?? null,
    getRepository: async () => user!.repo,
    getProvider: () => (typeof provider === "function" ? provider() : provider),
  };
}

export async function readEvents(res: Response): Promise<ChatStreamEvent[]> {
  const text = await res.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as ChatStreamEvent);
}
