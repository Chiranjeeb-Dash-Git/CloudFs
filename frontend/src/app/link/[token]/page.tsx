"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { WaveTerrain } from "@/components/WaveTerrain";

export default function PublicLinkPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<string>("Resolving link…");

  useEffect(() => {
    const token = params?.token;
    if (!token) return;
    fetch(`/api/link/${token}`, { credentials: "include" })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error?.message ?? "Link invalid");
        setData(JSON.stringify(json, null, 2));
      })
      .catch((e) => setData(e.message));
  }, [params]);

  return (
    <div className="theme-mono relative min-h-screen text-foreground">
      <WaveTerrain />
      <main className="relative z-10 mx-auto max-w-2xl px-6 py-24">
        <p className="mb-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Public link</p>
        <h1 className="mb-8 text-4xl font-light tracking-tight">Shared object</h1>
        <pre className="overflow-auto rounded-3xl border border-hairline bg-surface p-6 font-mono text-xs text-muted-foreground">
          {data}
        </pre>
      </main>
    </div>
  );
}
