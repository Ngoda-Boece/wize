/** Only same-site relative paths are accepted as post-login destinations (no open redirect). */
export function safeNext(next: unknown, fallback = "/app"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return /^[\w\-/?=&%.]*$/.test(next) ? next : fallback;
}
