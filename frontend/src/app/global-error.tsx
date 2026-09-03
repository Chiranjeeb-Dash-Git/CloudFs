"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[oklch(0.05_0_0)] px-6 text-center text-[#f4f4f5]">
          <div className="font-mono text-[11px] tracking-widest text-white/50 uppercase">CloudFS · Fatal</div>
          <h2 className="text-3xl font-light tracking-tight">The application ran into a problem</h2>
          <p className="max-w-md text-sm text-white/60">
            {error?.message || "A critical error occurred. Please refresh the page."}
          </p>
          <button
            onClick={reset}
            className="mt-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm transition-colors hover:bg-white/5"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
