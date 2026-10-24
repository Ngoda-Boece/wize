// Wire format of POST /api/chat: newline-delimited JSON events.
import type { Message } from "./types";

export type ChatStreamEvent =
  | { type: "start"; userMessage: Message | null; simulated: boolean }
  | { type: "delta"; text: string }
  | { type: "done"; message: Message }
  | { type: "error"; code: string; message: string; retryable: boolean; partial: Message | null };

export function encodeEvent(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

/** Incrementally parses NDJSON chunks; returns complete events and keeps the remainder buffered. */
export function createEventParser() {
  let buffer = "";
  const decoder = new TextDecoder();
  return (chunk: Uint8Array): ChatStreamEvent[] => {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    return lines.filter((l) => l.trim()).map((l) => JSON.parse(l) as ChatStreamEvent);
  };
}
