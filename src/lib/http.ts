import { NextResponse } from "next/server";

export function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * CSRF defence for JSON route handlers: browsers always send Origin on
 * cross-site POST/PATCH/DELETE, so a mismatch means the request was not issued
 * by our own pages. (Server Actions have the same check built in.)
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Reads a JSON body while enforcing a hard size limit. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<{ ok: true; data: unknown } | { ok: false; status: number }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return { ok: false, status: 413 };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, status: 413 };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400 };
  }
}
