import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { mapAnthropicError } from "@/lib/ai/anthropic";

const headers = new Headers();

describe("Anthropic error mapping", () => {
  it("maps SDK errors to user-safe codes without leaking provider details", () => {
    const cases: [unknown, string][] = [
      [new Anthropic.RateLimitError(429, { secret: "x" }, "rate limited: org-123", headers), "rate_limited"],
      [new Anthropic.AuthenticationError(401, undefined, "invalid x-api-key sk-ant-abc", headers), "config"],
      [new Anthropic.InternalServerError(529, undefined, "overloaded", headers), "overloaded"],
      [new Anthropic.APIConnectionTimeoutError({ message: "timeout" }), "timeout"],
      [new Anthropic.BadRequestError(400, undefined, "messages: invalid", headers), "provider"],
      [new Error("boom"), "provider"],
    ];
    for (const [err, code] of cases) {
      const mapped = mapAnthropicError(err);
      expect(mapped.code).toBe(code);
      expect(mapped.message).not.toMatch(/sk-ant|org-123|x-api-key|messages:/);
    }
  });

  it("treats an aborted signal as a user stop", () => {
    const controller = new AbortController();
    controller.abort();
    expect(mapAnthropicError(new Error("aborted"), controller.signal).code).toBe("aborted");
  });
});
