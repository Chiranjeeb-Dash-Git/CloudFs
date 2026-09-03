"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local and restart.");
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setError(err?.message || "Could not start Google sign-in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full mt-2">
      <button
        onClick={handleSignIn}
        type="button"
        disabled={loading}
        className="sheen relative flex h-[52px] w-full items-center justify-center gap-3 overflow-hidden rounded-full border border-hairline bg-surface text-sm font-medium transition-all hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        {loading ? (
          <span className="font-mono text-xs tracking-widest text-[#f4f4f5]/80 animate-pulse">CONNECTING TO GOOGLE...</span>
        ) : (
          <>
            <iconify-icon icon="logos:google-icon" style={{ fontSize: "18px" }} />
            <span className="text-[#f4f4f5]/90">Continue with Google</span>
          </>
        )}
      </button>
      {error ? (
        <p className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default GoogleSignInButton;
