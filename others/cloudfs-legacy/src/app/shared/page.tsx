"use client";

import { ArrowUpRight, Bell, Cloud, Eye, Link2, Search, Share2, Shield, Star, Trash2, Upload, User, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { WaveTerrain } from "@/components/WaveTerrain";
import { Nav } from "@/components/Nav";

const navItems = ["Dashboard", "Files", "Shared", "Security", "Settings"];

const sharedWithMe = [
  { name: "Q3_campaign_brief.pdf", type: "Document", size: "2.4 MB", sharedBy: "Sarah M.", role: "Editor", ago: "2h" },
  { name: "brand_guidelines_v3.fig", type: "Figma", size: "184 MB", sharedBy: "Design Team", role: "Viewer", ago: "1d" },
  { name: "client_assets/", type: "Folder", size: "4.2 GB", sharedBy: "Alex K.", role: "Editor", ago: "3d" },
  { name: "quarterly_metrics.xlsx", type: "Spreadsheet", size: "8.1 MB", sharedBy: "Jonas R.", role: "Viewer", ago: "1w" },
];

const sharedByMe = [
  { name: "project_proposal.pdf", type: "Document", size: "1.2 MB", sharedWith: "Client ABC", role: "Viewer", expires: "7 days" },
  { name: "design_system/", type: "Folder", size: "512 MB", sharedWith: "External Agency", role: "Editor", expires: "30 days" },
  { name: "press_kit.zip", type: "Archive", size: "240 MB", sharedWith: "Public link", role: "Viewer", expires: "14 days" },
];

export default function SharedPage() {
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
              <h1 className="text-4xl font-light tracking-tight md:text-5xl">Shared with you</h1>
            </div>
          </header>
        </Reveal>

        {/* Filter tabs */}
        <Reveal className="mb-8" delay={60}>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full border border-hairline bg-surface-2 px-4 py-1.5 text-xs font-medium transition-colors duration-300">All</button>
            <button className="rounded-full border border-hairline bg-surface px-4 py-1.5 text-xs font-medium transition-colors duration-300 hover:bg-surface-2">Shared with me</button>
            <button className="rounded-full border border-hairline bg-surface px-4 py-1.5 text-xs font-medium transition-colors duration-300 hover:bg-surface-2">Shared by me</button>
            <button className="rounded-full border border-hairline bg-surface px-4 py-1.5 text-xs font-medium transition-colors duration-300 hover:bg-surface-2">Public links</button>
          </div>
        </Reveal>

        {/* Shared with me */}
        <Reveal className="mb-12" delay={100}>
          <h2 className="mb-6 text-xl font-normal tracking-tight">Shared with me</h2>
          <div className="overflow-hidden rounded-3xl border border-hairline bg-surface backdrop-blur-xl">
            {sharedWithMe.map((f, i) => (
              <Reveal key={f.name} delay={i * 70}>
                <div className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-hairline px-6 py-5 transition-colors duration-300 last:border-b-0 hover:bg-surface-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
                  <span className="truncate font-mono text-sm">{f.name}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">{f.type}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">{f.size}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">{f.sharedBy}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-mono text-primary">
                    {f.role === "Editor" ? <UserCheck className="size-3" /> : <Eye className="size-3" />} {f.role}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {f.ago}
                    <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100" strokeWidth={1.5} />
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* Shared by me */}
        <Reveal className="mb-12" delay={140}>
          <h2 className="mb-6 text-xl font-normal tracking-tight">Shared by me</h2>
          <div className="overflow-hidden rounded-3xl border border-hairline bg-surface backdrop-blur-xl">
            {sharedByMe.map((f, i) => (
              <Reveal key={f.name} delay={i * 70}>
                <div className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-hairline px-6 py-5 transition-colors duration-300 last:border-b-0 hover:bg-surface-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
                  <span className="truncate font-mono text-sm">{f.name}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">{f.type}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">{f.size}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">{f.sharedWith}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-mono text-primary">
                    {f.role === "Editor" ? <UserCheck className="size-3" /> : <Eye className="size-3" />} {f.role}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {f.expires}
                    <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100" strokeWidth={1.5} />
                  </span>
                </div>
              </Reveal>
            ))}
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