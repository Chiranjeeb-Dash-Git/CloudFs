import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const host = request.headers.get("host") || new URL(request.url).host;
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;

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
          // Server component cookie write limitations — handled explicitly below
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

    // Extract profile details from Google/Supabase authentication
    const rawName = supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name;
    const rawAvatar = supabaseUser.user_metadata?.avatar_url ?? supabaseUser.user_metadata?.picture;
    const rawSub = supabaseUser.user_metadata?.sub ?? supabaseUser.id;
    const userEmail = (supabaseUser.email || "").toLowerCase();

    // Authenticate and issue CloudFS session in-process safely
    try {
      const { mem, ensureStoreReady } = await import("../../../../../backend/src/store.js");
      const { setAuthCookies, recordSession } = await import("../../../../../backend/src/auth.js");

      // Ensure store initialization has settled (non-blocking if DB down)
      await Promise.race([
        ensureStoreReady(),
        new Promise((r) => setTimeout(r, 2000)),
      ]).catch(() => {});

      let dbUser = await mem.findUser(null, rawSub);
      if (!dbUser && userEmail) dbUser = await mem.findUser(null, null, userEmail);

      if (!dbUser) {
        dbUser = {
          id: mem.id(),
          email: userEmail,
          name: rawName || userEmail.split("@")[0] || "User",
          imageUrl: rawAvatar || null,
          passwordHash: null,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          providers: { google: { sub: rawSub, email: userEmail } },
          quotaBytes: mem.DEFAULT_QUOTA_BYTES,
          createdAt: mem.now(),
        };
        mem.users.push(dbUser);
      } else {
        dbUser.providers = { ...(dbUser.providers || {}), google: { sub: rawSub, email: userEmail } };
        if (rawAvatar) dbUser.imageUrl = rawAvatar;
        if (rawName) dbUser.name = rawName;
      }

      const finalRes = applyCookies(NextResponse.redirect(`${origin}${next}`));

      // Mock Express response object to write JWT auth cookies directly onto NextResponse
      const isProd = process.env.NODE_ENV === "production" || host.includes("vercel.app");
      const mockRes: any = {
        cookie(name: string, val: string, options: any = {}) {
          finalRes.cookies.set(name, val, {
            httpOnly: options.httpOnly ?? true,
            sameSite: options.sameSite ?? "lax",
            secure: isProd,
            path: options.path ?? "/",
            maxAge: options.maxAge ? Math.floor(options.maxAge / 1000) : undefined,
          });
        },
      };

      const jti = mem.id();
      setAuthCookies(mockRes, dbUser, { refreshJti: jti });
      recordSession(dbUser.id, request as any, jti);

      return finalRes;
    } catch (sessionErr: any) {
      console.error("[auth/callback] In-process Google auth error:", sessionErr);
      return redirectWithError("auth-backend-bridge-failed");
    }
  } catch (topLevelErr: any) {
    console.error("[auth/callback] unexpected top-level error:", topLevelErr);
    return redirectWithError("auth-unexpected");
  }
}
