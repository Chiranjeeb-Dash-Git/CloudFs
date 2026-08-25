"use client";

import { ArrowUpRight, Bell, Clock, Cloud, RefreshCw, Search, Shield, Trash2, Upload, User, X } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { WaveTerrain } from "@/components/WaveTerrain";
import { Nav } from "@/components/Nav";

const trashItems = [
  { name: "old_draft_v1.mp4", type: "Video", size: "1.2 GB", deletedBy: "Alex K.", deletedAt: "2h ago", daysLeft: 28 },
  { name: "unused_assets/", type: "Folder", size: "840 MB", deletedBy: "Mira T.", deletedAt: "1d ago", daysLeft: 27 },
  { name: "temp_export.pdf", type: "Document", size: "45 MB", deletedBy: "Alex K.", deletedAt: "3d ago", daysLeft: 25 },
  { name: "test_dataset.parquet", type: "Dataset", size: "2.1 GB", deletedBy: "Jonas R.", deletedAt: "5d ago", daysLeft: 23 },
  { name: "duplicate_images/", type: "Folder", size: "512 MB", deletedBy: "Ada P.", deletedAt: "1w ago", daysLeft: 20 },
];

export default function TrashPage() {
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
              <span>30-day retention · 12 items · 4.7 GB</span>
            </div>
          </header>
        </Reveal>

        <Reveal className="mb-8" delay={60}>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full border border-hairline bg-surface-2 px-4 py-1.5 text-xs font-medium transition-colors duration-300">All</button>
            <button className="rounded-full border border-hairline bg-surface px-4 py-1.5 text-xs font-medium transition-colors duration-300 hover:bg-surface-2">Files</button>
            <button className="rounded-full border border-hairline bg-surface px-4 py-1.5 text-xs font-medium transition-colors duration-300 hover:bg-surface-2">Folders</button>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="overflow-hidden rounded-3xl border border-hairline bg-surface backdrop-blur-xl">
            {trashItems.map((item, i) => (
              <Reveal key={item.name} delay={i * 70}>
                <div className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-hairline px-6 py-5 transition-colors duration-300 last:border-b-0 hover:bg-surface-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
                  <span className="truncate font-mono text-sm">{item.name}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">{item.type}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">{item.size}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">{item.deletedBy}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> {item.daysLeft}d left
                    </span>
                    <span className="hidden md:block">{item.deletedAt}</span>
                    <div className="flex items-center gap-2">
                      <button className="flex items-center justify-center gap-1.5 rounded-full border border-green-500/50 bg-green-500/10 px-3 py-1.5 text-xs text-green-500 transition-colors hover:bg-green-500/20">
                        <RefreshCw className="size-3" /> Restore
                      </button>
                      <button className="flex items-center justify-center gap-1.5 rounded-full border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/20">
                        <X className="size-3" /> Delete
                      </button>
                    </div>
                    <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100" strokeWidth={1.5} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal className="mt-8" delay={200}>
          <div className="panel">
            <div className="panel-inner flex flex-col items-center gap-4 px-8 py-12 text-center">
              <Trash2 className="size-12 text-muted-foreground" strokeWidth={1.2} />
              <h3 className="text-xl font-normal tracking-tight">Empty trash?</h3>
              <p className="text-sm text-muted-foreground max-w-md">Permanently delete all 12 items (4.7 GB). This action cannot be undone.</p>
              <button className="mt-2 flex w-full max-w-xs items-center justify-center gap-2 rounded-full border border-destructive bg-transparent px-4 py-2.5 text-sm text-destructive transition-colors duration-300 hover:bg-destructive/10">
                <Trash2 className="size-4" /> Empty Trash Permanently
              </button>
            </div>
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