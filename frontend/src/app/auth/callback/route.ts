import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignored in Server Components
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Get the authenticated Supabase user
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Bridge to the Express backend: call /api/auth/google to create
        // a backend session with proper cookies
        const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
        const backendRes = await fetch(`${apiBase}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
            imageUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            googleSub: user.user_metadata?.sub || user.id,
          }),
        });

        if (backendRes.ok) {
          // Forward the backend session cookies to the browser
          const response = NextResponse.redirect(`${origin}${next}`);
          const setCookies = backendRes.headers.getSetCookie();
          for (const cookie of setCookies) {
            response.headers.append("Set-Cookie", cookie);
          }
          return response;
        }
      }

      // Supabase auth succeeded but backend bridge failed — still redirect
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
