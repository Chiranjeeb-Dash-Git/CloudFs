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
  const apiBase = process.env.NEXT_PUBLIC_API_URL || origin;

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
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser();
    if (getUserError || !user) {
      console.error("[auth/callback] getUser failed:", getUserError);
      return redirectWithError("auth-no-user");
    }

    let backendOk = false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AUTH_CALLBACK_TIMEOUT_MS);

      const rawName = user.user_metadata?.full_name ?? user.user_metadata?.name;
      const rawAvatar = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
      const rawSub = user.user_metadata?.sub ?? user.id;

      const bridgePayload: Record<string, unknown> = {
        email: user.email,
        googleSub: rawSub,
      };
      if (rawName && typeof rawName === "string") bridgePayload.name = rawName;
      if (rawAvatar && typeof rawAvatar === "string") bridgePayload.imageUrl = rawAvatar;

      console.log("[auth/callback] calling backend bridge at", `${apiBase}/api/auth/google`, "payload keys:", Object.keys(bridgePayload));

      const backendRes = await fetch(`${apiBase}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bridgePayload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (backendRes.ok) {
        const finalRes = applyCookies(NextResponse.redirect(`${origin}${next}`));
        for (const cookie of backendRes.headers.getSetCookie()) {
          finalRes.headers.append("Set-Cookie", cookie);
        }
        backendOk = true;
        return finalRes;
      } else {
        let body: any = null;
        try {
          body = await backendRes.json();
        } catch {}
        console.error(
          `[auth/callback] backend bridge returned non-OK status=${backendRes.status} statusText=${backendRes.statusText} body=`,
          body
        );
        const detailCode = body?.error?.code ? `${backendRes.status}-${body.error.code}` : String(backendRes.status);
        return redirectWithError(`auth-backend-bridge-${detailCode}`);
      }
    } catch (bridgeErr: any) {
      if (bridgeErr?.name === "AbortError") {
        console.error("[auth/callback] backend bridge timed out after", AUTH_CALLBACK_TIMEOUT_MS, "ms");
        return redirectWithError("auth-backend-bridge-timeout");
      } else {
        console.error("[auth/callback] backend bridge fetch failed:", bridgeErr);
        return redirectWithError("auth-backend-bridge-unreachable");
      }
    }
  } catch (topLevelErr: any) {
    console.error("[auth/callback] unexpected top-level error:", topLevelErr);
    return redirectWithError("auth-unexpected");
  }

  return redirectWithError("auth-unknown");
}
