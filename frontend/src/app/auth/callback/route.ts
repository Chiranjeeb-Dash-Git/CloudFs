import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const AUTH_CALLBACK_TIMEOUT_MS = 10_000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Determine origin and API base URL
  const host = request.headers.get("host") || new URL(request.url).host;
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;

  // Use NEXT_PUBLIC_API_URL if set, otherwise default to the current origin (same-domain backend)
  let apiBase = process.env.NEXT_PUBLIC_API_URL || origin;

  // Force origin if we're on Vercel but apiBase points to localhost
  if (host.includes("vercel.app") && apiBase.includes("localhost")) {
    apiBase = origin;
  }

  const pendingSupabaseCookies: Array<{ name: string; value: string; options?: CookieOptions }> = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        pendingSupabaseCookies.push(...cookiesToSet);
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server component cookie write limitations — handled explicitly below via NextResponse
        }
      },
    },
  });

  function applyCookies(response: NextResponse) {
    for (const c of pendingSupabaseCookies) {
      response.cookies.set(c.name, c.value, c.options as any);
    }
    return response;
  }

  function redirectWithError(reason: string) {
    const url = new URL(`${origin}/login`);
    url.searchParams.set("error", reason);
    return applyCookies(NextResponse.redirect(url.toString()));
  }

  if (!code) {
    return redirectWithError("auth-missing-code");
  }

  if (!supabaseUrl || !supabaseAnon) {
    return redirectWithError("auth-supabase-not-configured");
  }

  try {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error("[auth/callback] exchangeCodeForSession failed:", exchangeError);
      return redirectWithError("auth-exchange-failed");
    }

    const {
      data: { user: supabaseUser },
      error: getUserError,
    } = await supabase.auth.getUser();
    if (getUserError || !supabaseUser) {
      console.error("[auth/callback] getUser failed:", getUserError);
      return redirectWithError("auth-no-user");
    }

    // Extract Google profile data from Supabase user metadata
    const rawName = supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name;
    const rawAvatar = supabaseUser.user_metadata?.avatar_url ?? supabaseUser.user_metadata?.picture;
    const rawSub = supabaseUser.user_metadata?.sub ?? supabaseUser.id;
    const userEmail = (supabaseUser.email || "").toLowerCase();

    // Call the backend's existing /api/auth/google endpoint via HTTP
    // This avoids fragile cross-boundary imports of backend modules (pg, store, auth)
    // that crash when the database is unreachable or modules can't be bundled by Next.js
    let backendRes: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AUTH_CALLBACK_TIMEOUT_MS);

      backendRes = await fetch(`${apiBase}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          name: rawName || userEmail.split("@")[0] || "User",
          imageUrl: rawAvatar || null,
          googleSub: rawSub,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
    } catch (fetchErr: any) {
      console.error("[auth/callback] Backend fetch error:", fetchErr);
      if (fetchErr?.name === "AbortError") {
        return redirectWithError("auth-backend-bridge-timeout");
      }
      return redirectWithError("auth-backend-bridge-unreachable");
    }

    if (!backendRes.ok) {
      const errBody = await backendRes.text().catch(() => "");
      console.error("[auth/callback] Backend returned non-OK:", backendRes.status, errBody);
      return redirectWithError("auth-backend-bridge-failed");
    }

    // Build the redirect response and forward the auth cookies set by the backend
    const finalRes = applyCookies(NextResponse.redirect(`${origin}${next}`));

    // Forward Set-Cookie headers from the backend response to the browser
    const setCookieHeaders = backendRes.headers.getSetCookie?.() ?? [];
    for (const rawCookie of setCookieHeaders) {
      // Parse each Set-Cookie header and apply it to the NextResponse
      const parsed = parseSetCookie(rawCookie);
      if (parsed) {
        finalRes.cookies.set(parsed.name, parsed.value, parsed.options);
      }
    }

    return finalRes;
  } catch (topLevelErr: any) {
    console.error("[auth/callback] unexpected top-level error:", topLevelErr);
    return redirectWithError("auth-unexpected");
  }
}

/** Parse a raw Set-Cookie header string into name, value, and cookie options */
function parseSetCookie(raw: string): { name: string; value: string; options: Record<string, any> } | null {
  const parts = raw.split(";").map((s) => s.trim());
  if (!parts[0]) return null;

  const eqIdx = parts[0].indexOf("=");
  if (eqIdx < 0) return null;

  const name = parts[0].slice(0, eqIdx).trim();
  const value = parts[0].slice(eqIdx + 1).trim();
  const options: Record<string, any> = {};

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const lower = part.toLowerCase();
    if (lower === "httponly") {
      options.httpOnly = true;
    } else if (lower === "secure") {
      options.secure = true;
    } else if (lower.startsWith("samesite=")) {
      options.sameSite = part.split("=")[1]?.toLowerCase() as any;
    } else if (lower.startsWith("path=")) {
      options.path = part.split("=")[1];
    } else if (lower.startsWith("max-age=")) {
      options.maxAge = parseInt(part.split("=")[1] || "0", 10);
    }
  }

  return { name, value, options };
}
