"use client";

import { useEffect } from "react";
import { ArrowUpRight, Cloud, Eye, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Reveal } from "@/components/Reveal";
import { WaveTerrain } from "@/components/WaveTerrain";
import { Nav } from "@/components/Nav";

export default function SharedPage() {
  const router = useRouter();

  const { data: meData, error: meError, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
  });

  useEffect(() => {
    if (meError) router.push("/login");
  }, [meError, router]);

  const { data: searchData } = useQuery({
    queryKey: ["search", ""],
    queryFn: () => api.search(""),
    refetchInterval: 5000,
  });

  const files = searchData?.results ?? [];

  if (meLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[oklch(0.05_0_0)] text-white font-mono text-sm tracking-widest animate-pulse">
        LOADING SHARED...
      </div>
    );
  }

  return (
    <div className="theme-mono relative min-h-screen overflow-x-hidden text-foreground">
      <WaveTerrain />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,oklch(1_0_0/8%)_0%,transparent_55%)]" />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1280px] flex-col px-6 py-10">
        <Nav theme="mono" showUpload={false} />

        <Reveal className="mb-12">
          <header className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="mb-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Shared</p>
              <h1 className="text-4xl font-light tracking-tight md:text-5xl">Shared Files</h1>
            </div>
          </header>
        </Reveal>

        <Reveal className="mb-12" delay={100}>
          <h2 className="mb-6 text-xl font-normal tracking-tight">Active Files & Shares ({files.length})</h2>
          <div className="overflow-hidden rounded-3xl border border-hairline bg-surface backdrop-blur-xl">
            {files.length === 0 ? (
              <div className="p-12 text-center text-sm font-mono text-muted-foreground">
                No active shared files found.
              </div>
            ) : (
              files.map((f: any, i: number) => (
                <Reveal key={f.id} delay={i * 70}>
                  <div className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-hairline px-6 py-5 transition-colors duration-300 last:border-b-0 hover:bg-surface-2 md:grid-cols-[2fr_1fr_1fr_auto]">
                    <span className="truncate font-mono text-sm">{f.name}</span>
                    <span className="hidden text-xs text-muted-foreground md:block">{"mimeType" in f ? f.mimeType : "Folder"}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-mono text-primary w-fit">
                      <UserCheck className="size-3" /> Owner
                    </span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100" strokeWidth={1.5} />
                    </span>
                  </div>
                </Reveal>
              ))
            )}
          </div>
        </Reveal>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-hairline py-8 text-xs text-muted-foreground md:flex-row">
          <span className="flex items-center gap-2"><Cloud className="size-4" strokeWidth={1.4} /> CloudFS</span>
          <span className="font-mono">All systems nominal · edge sync 12 ms</span>
        </footer>
      </main>
    </div>
  );
}