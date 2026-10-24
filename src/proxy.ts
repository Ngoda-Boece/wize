import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/env";

// Refreshes the Supabase session on every navigation and performs an early
// redirect for private pages. This is an optimisation only: every private page
// and API route re-checks authentication on the server.
export async function proxy(request: NextRequest) {
  const config = supabaseConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isPrivate = request.nextUrl.pathname === "/app" || request.nextUrl.pathname.startsWith("/app/");
  if (isPrivate && !data?.claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
