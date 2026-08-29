"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { ArrowUpRight, Clock, Cloud, RefreshCw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Reveal } from "@/components/Reveal";
const WaveTerrain = dynamic(() => import("@/components/WaveTerrain"), { ssr: false });
import { Nav } from "@/components/Nav";

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function TrashPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { error: meError, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
  });

  useEffect(() => {
    if (meError) router.push("/login");
  }, [meError, router]);

  const { data: trashData } = useQuery({
    queryKey: ["trash"],
    queryFn: api.trash,
    refetchInterval: 30_000,
  });

  const items = trashData?.items ?? [];
  const totalSizeBytes = items.reduce((acc: number, item: any) => acc + (item.sizeBytes ?? 0), 0);

  async function handleRestore(resourceType: "file" | "folder", resourceId: string) {
    try {
      await api.restore({ resourceType, resourceId });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: ["recent"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
    } catch (err) {
      console.error("Failed to restore item:", err);
    }
  }

  if (meLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[oklch(0.05_0_0)] text-white font-mono text-sm tracking-widest animate-pulse">
        LOADING TRASH...
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
              <p className="mb-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Trash</p>
              <h1 className="text-4xl font-light tracking-tight md:text-5xl">Deleted Items</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trash2 className="size-4" />
              <span>30-day retention · {items.length} items · {formatBytes(totalSizeBytes)}</span>
            </div>
          </header>
        </Reveal>

        <Reveal delay={100}>
          <div className="overflow-hidden rounded-3xl border border-hairline bg-surface backdrop-blur-xl">
            {items.length === 0 ? (
              <div className="p-12 text-center text-sm font-mono text-muted-foreground">
                Trash is empty
              </div>
            ) : (
              items.map((item: any, i: number) => {
                const isFile = "mimeType" in item;
                const resourceType = isFile ? "file" : "folder";
                return (
                  <Reveal key={item.id} delay={i * 70}>
                    <div className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-hairline px-6 py-5 transition-colors duration-300 last:border-b-0 hover:bg-surface-2 md:grid-cols-[2fr_1fr_1fr_auto_auto]">
                      <span className="truncate font-mono text-sm">{item.name}</span>
                      <span className="hidden text-xs text-muted-foreground md:block">
                        {isFile ? (item.mimeType || "File") : "Folder"}
                      </span>
                      <span className="hidden text-xs text-muted-foreground md:block">
                        {isFile ? formatBytes(item.sizeBytes) : "--"}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRestore(resourceType, item.id)}
                            className="flex items-center justify-center gap-1.5 rounded-full border border-green-500/50 bg-green-500/10 px-3 py-1.5 text-xs text-green-500 transition-colors hover:bg-green-500/20"
                          >
                            <RefreshCw className="size-3" /> Restore
                          </button>
                        </div>
                        <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100" strokeWidth={1.5} />
                      </div>
                    </div>
                  </Reveal>
                );
              })
            )}
          </div>
        </Reveal>

        <footer className="mt-auto flex flex-col items-center justify-between gap-3 border-t border-hairline py-8 text-xs text-muted-foreground md:flex-row">
          <span className="flex items-center gap-2"><Cloud className="size-4" strokeWidth={1.4} /> CloudFS</span>
          <span className="font-mono">All systems nominal · edge sync 12 ms</span>
        </footer>
      </main>
    </div>
  );
}