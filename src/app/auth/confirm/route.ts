import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/safe-next";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Landing point for e-mail links (sign-up confirmation, password reset).
// Supports both the token_hash template and the PKCE `code` flow.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  if (isDemoMode()) return NextResponse.redirect(new URL("/login", origin));

  const supabase = await createSupabaseServerClient();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  let ok = false;
  if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  else if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;

  return NextResponse.redirect(new URL(ok ? next : "/login?error=lien", origin));
}
