// Central place to read configuration. Nothing here throws at import time so a
// missing secret never takes down the marketing pages.

export function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

/**
 * Demo mode = Supabase is not configured. The app then runs with a single
 * in-memory demo account so the interface can be explored without any paid
 * service. Demo data lives in server memory and is lost on restart.
 */
export function isDemoMode(): boolean {
  return supabaseConfig() === null;
}

export function supabaseSecretKey(): string | null {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

export const DEFAULT_MODEL = "claude-opus-5-5";

export type AiConfig =
  | { kind: "anthropic"; apiKey: string; model: string; effort: "low" | "medium" | "high"; refusalFallback: boolean }
  | { kind: "mock" }
  | { kind: "unconfigured" };

/**
 * Resolves which AI backend serves chat requests.
 *
 * Simulated replies are only ever used in demo mode or when explicitly
 * requested in development. A production deployment without an API key gets
 * "unconfigured" (a clear error), never silent fake answers.
 */
export function aiConfig(): AiConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const forceMock = process.env.WIZE_MOCK_AI === "1" && process.env.NODE_ENV !== "production";
  if (apiKey && !forceMock) {
    const effort = process.env.ANTHROPIC_EFFORT;
    return {
      kind: "anthropic",
      apiKey,
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      effort: effort === "low" || effort === "high" ? effort : "medium",
      refusalFallback: process.env.ANTHROPIC_REFUSAL_FALLBACK !== "off",
    };
  }
  if (forceMock || isDemoMode()) return { kind: "mock" };
  return { kind: "unconfigured" };
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
