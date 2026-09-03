"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[oklch(0.05_0_0)] px-6 text-center text-[#f4f4f5]">
      <div className="font-mono text-[11px] tracking-widest text-white/50 uppercase">CloudFS · Error</div>
      <h2 className="text-3xl font-light tracking-tight">Something went wrong</h2>
      <p className="max-w-md text-sm text-white/60">
        {error?.message || "An unexpected error occurred while loading this page."}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm transition-colors hover:bg-white/5"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm transition-colors hover:bg-white/5"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
