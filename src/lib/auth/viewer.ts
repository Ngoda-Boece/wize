import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEMO_COOKIE = "wize_demo_id";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Viewer = {
  id: string;
  email: string | null;
  kind: "supabase" | "demo";
};

/**
 * Returns the authenticated user, derived exclusively from the server-side
 * session — never from a user id sent by the browser.
 *
 * In demo mode each visitor gets a random, isolated demo identity stored in an
 * httpOnly cookie, so demo visitors never see each other's data.
 */
export async function getViewer(): Promise<Viewer | null> {
  if (isDemoMode()) {
    const id = (await cookies()).get(DEMO_COOKIE)?.value;
    return id && UUID_RE.test(id) ? { id, email: null, kind: "demo" } : null;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { id: data.claims.sub, email, kind: "supabase" };
}

/** For Server Components / actions: redirects to /login when signed out. */
export async function requireViewer(next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return viewer;
}
