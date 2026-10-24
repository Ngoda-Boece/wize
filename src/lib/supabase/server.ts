import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfig, supabaseSecretKey } from "@/lib/env";

/** Supabase client bound to the current user's session cookies (RLS applies). */
export async function createSupabaseServerClient() {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase n'est pas configuré.");
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there. The
          // proxy refreshes the session, so this can be safely ignored.
        }
      },
    },
  });
}

/**
 * Privileged client (bypasses RLS). Only used for account deletion. Returns
 * null when no secret key is configured.
 */
export function createSupabaseAdminClient() {
  const config = supabaseConfig();
  const secret = supabaseSecretKey();
  if (!config || !secret) return null;
  return createClient(config.url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
