"use client";

import { supabase } from "@/lib/supabaseClient";

export function GoogleSignInButton() {
  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Google sign in error:", err);
    }
  };

  return (
    <button
      onClick={handleSignIn}
      type="button"
      className="sheen relative flex h-[52px] items-center justify-center gap-3 overflow-hidden rounded-full border border-hairline bg-surface text-sm font-medium transition-all hover:bg-white/5 w-full cursor-pointer mt-2"
    >
      <iconify-icon icon="logos:google-icon" style={{ fontSize: "18px" }} />
      <span className="text-[#f4f4f5]/90">Continue with Google</span>
    </button>
  );
}

export default GoogleSignInButton;
