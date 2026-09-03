"use client";

import {
  ArrowUpRight,
  Bell,
  ChartNoAxesColumn,
  Cloud,
  FolderPlus,
  Layers,
  Link2,
  Lock,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Reveal } from "@/components/Reveal";
const StorageOrb = dynamic(() => import("@/components/StorageOrb"), { ssr: false });
const WaveTerrain = dynamic(() => import("@/components/WaveTerrain"), { ssr: false });
import { Nav } from "@/components/Nav";
import { useDriveUi } from "@/components/DriveUi";

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

const pillars = [
  {
    icon: Lock,
    title: "Encrypted at rest",
    body: "AES-256 envelope keys rotated every 30 days, per-object. Nothing leaves a region unencrypted.",
  },
  {
    icon: Layers,
    title: "Mirrored 3 regions",
    body: "Every write lands in three isolated zones before it is acknowledged back to your client.",
  },
  {
    icon: Users,
    title: "Live presence",
    body: "See cursors, locks and version branches the moment a teammate opens the same file.",
  },
];

export default function DashboardPage() {
  const ui = useDriveUi();
  const router = useRouter();

  const { data: meData, error: meError, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
  });

  const { data: storageData } = useQuery({
    queryKey: ["storage"],
    queryFn: api.storage,
    refetchInterval: 30_000,
  });

  const { data: recentData } = useQuery({
    queryKey: ["recent"],
    queryFn: api.recent,
    refetchInterval: 15_000,
  });

  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (meError && redirectCountdown === null) {
      setRedirectCountdown(3);
    }
  }, [meError, redirectCountdown]);

  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      router.replace("/login");
      return;
    }
    const t = setTimeout(() => setRedirectCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [redirectCountdown, router]);

  const user = meData?.user;
  const storage = storageData;
  const recentFiles = recentData?.items || [];

  if (meLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[oklch(0.05_0_0)] text-white">
        <div className="font-mono text-sm tracking-widest animate-pulse">LOADING CONTROL ROOM...</div>
      </div>
    );
  }

  if (meError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[oklch(0.05_0_0)] px-6 text-center text-white">
        <div className="font-mono text-[11px] tracking-widest text-white/50 uppercase">CloudFS · Auth</div>
        <h1 className="text-4xl font-light tracking-tight">You are not signed in</h1>
        <p className="max-w-md text-sm text-white/60">
          {meError?.message || "Your session could not be verified."}
        </p>
        <p className="max-w-md text-xs text-white/40 font-mono">
          Redirecting to sign-in in {redirectCountdown}s...
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => router.replace("/login")}
            className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm transition-colors hover:bg-white/5"
          >
            Sign in now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-mono relative min-h-screen overflow-x-hidden bg-[oklch(0.05_0_0)] text-foreground">
      <WaveTerrain />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,oklch(1_0_0/8%)_0%,transparent_55%)]" />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1280px] flex-col px-6 py-10">
        <Nav theme="mono" />

        {/* Header */}
        <Reveal className="mb-12">
          <header className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div>
              <div className="mb-4 flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                <span className="text-foreground/80">My Drive</span>
                <span>/</span>
                <span>Media</span>
                <span>/</span>
                <span>Q3 Campaign</span>
              </div>
              <h1 className="mb-3 text-4xl font-light tracking-tight md:text-6xl">
                Welcome back, {user?.name?.split(" ")[0] || "User"}.
              </h1>
              <p className="max-w-md text-sm text-muted-foreground">
                {formatBytes(storage?.usedBytes ?? 0)} used of {formatBytes(storage?.quotaBytes ?? 524288000)} — everything synced and stored securely in the cloud database.
              </p>
            </div>

            <button
              onClick={() => ui.openUpload()}
              className="sheen relative flex h-[52px] shrink-0 items-center gap-2 overflow-hidden rounded-full border border-hairline bg-secondary px-6 text-sm font-medium transition-transform duration-500 hover:-translate-y-0.5"
            >
              <Upload className="relative z-10 size-4" strokeWidth={1.6} />
              <span className="relative z-10">Upload Files</span>
            </button>
          </header>
        </Reveal>

        {/* Bento grid */}
        <section className="grid grid-cols-1 gap-5 md:h-[600px] md:grid-cols-12">
          {/* Column 1 */}
          <div className="flex h-full flex-col gap-5 md:col-span-4">
            <Reveal className="flex-1" delay={60} parallax={20}>
              <article className="panel h-full min-h-[160px]">
                <div className="panel-inner flex flex-col justify-between p-7">
                  <div className="flex items-start justify-between">
                    <h2 className="w-3/4 text-xl font-normal tracking-tight">Quick Actions</h2>
                    <FolderPlus className="size-5 text-muted-foreground" strokeWidth={1.3} />
                  </div>
                  <div className="mt-6 flex gap-2">
                    <button
                      onClick={() => ui.openFolder()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full border border-hairline bg-surface-2 px-4 py-2.5 text-xs transition-colors duration-300 hover:bg-accent"
                    >
                      <FolderPlus className="size-3.5" strokeWidth={1.5} /> New Folder
                    </button>
                    <button
                      onClick={() => ui.openShare()}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full border border-hairline bg-surface-2 px-4 py-2.5 text-xs transition-colors duration-300 hover:bg-accent"
                    >
                      <Share2 className="size-3.5" strokeWidth={1.5} /> Share
                    </button>
                  </div>
                </div>
              </article>
            </Reveal>

            <Reveal className="flex-1" delay={140} parallax={30}>
              <article className="panel h-full min-h-[190px]">
                <div className="panel-inner p-7">
                  <StorageOrb />
                  <div className="relative flex h-full flex-col justify-between">
                    <h2 className="w-3/4 text-xl font-normal tracking-tight">
                      Storage Usage — {storage?.percentUsed?.toFixed(0) ?? "0"}%
                    </h2>
                    <div className="flex items-end justify-between">
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatBytes(storage?.freeBytes ?? 16106127360)} free
                      </span>
                      <div className="flex size-8 items-center justify-center rounded-full border border-hairline bg-surface-2">
                        <ChartNoAxesColumn className="size-4" strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>

            <Reveal className="flex-1" delay={220} parallax={40}>
              <article className="panel h-full min-h-[160px]">
                <div className="panel-inner flex flex-col justify-between p-7">
                  <div className="flex items-start justify-between">
                    <h2 className="w-3/4 text-xl font-normal tracking-tight">Security & Sessions</h2>
                    <ShieldCheck className="size-5 text-muted-foreground" strokeWidth={1.3} />
                  </div>
                  <Link
                    href="/security"
                    className="mt-6 flex w-full items-center justify-between rounded-full border border-hairline bg-surface-2 px-4 py-2.5 transition-colors duration-300 hover:bg-accent"
                  >
                    <span className="text-xs">JWT sessions · encrypted at rest</span>
                    <ArrowUpRight className="size-4" strokeWidth={1.5} />
                  </Link>
                </div>
              </article>
            </Reveal>
          </div>

          {/* Column 2 */}
          <Reveal className="md:col-span-4" delay={100} parallax={50}>
            <article className="panel group h-[420px] cursor-pointer md:h-full" onClick={ui.openSearch}>
              <div className="panel-inner">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,oklch(1_0_0/12%)_0%,transparent_60%)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {user?.imageUrl ? (
                    <div className="float-slow relative h-40 w-40 rounded-full border border-hairline p-2 bg-zinc-900/30 backdrop-blur-md transition-transform duration-700 group-hover:scale-105 shadow-2xl flex items-center justify-center">
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#c9b98a] to-transparent opacity-20 blur-md group-hover:opacity-40 transition-opacity duration-700" />
                      <img 
                        src={user.imageUrl} 
                        alt={user?.name || "User"} 
                        className="size-full rounded-full object-cover relative z-10"
                      />
                      <span className="pulse-glow absolute top-2 right-2 size-2.5 rounded-full bg-[#c9b98a] z-20" />
                    </div>
                  ) : (
                    <div className="float-slow relative h-52 w-40 transition-transform duration-700 group-hover:scale-105">
                      <svg viewBox="0 0 160 210" className="h-full w-full" fill="none">
                        <defs>
                          <radialGradient id="orbGlow" cx="50%" cy="35%" r="65%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                          </radialGradient>
                          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f4f4f5" />
                            <stop offset="100%" stopColor="#71717a" />
                          </linearGradient>
                        </defs>
                        <circle cx="80" cy="90" r="75" fill="url(#orbGlow)" />
                        <ellipse cx="80" cy="55" rx="26" ry="30" stroke="url(#lineGrad)" strokeWidth="1.4" />
                        <path d="M56 45 Q80 10 104 45 Q108 30 80 22 Q52 30 56 45Z" stroke="url(#lineGrad)" strokeWidth="1.4" />
                        <path d="M70 80 L70 95 M90 80 L90 95" stroke="url(#lineGrad)" strokeWidth="1.4" />
                        <path d="M30 205 C30 140 55 100 80 100 C105 100 130 140 130 205" stroke="url(#lineGrad)" strokeWidth="1.4" />
                        <path d="M65 100 Q80 118 95 100" stroke="url(#lineGrad)" strokeWidth="1" />
                      </svg>
                      <span className="pulse-glow absolute top-4 right-4 size-2 rounded-full bg-foreground" />
                    </div>
                  )}
                </div>

                <div className="relative flex h-full flex-col justify-between p-7">
                  <div className="flex w-max items-center gap-2 rounded-full border border-hairline bg-surface-2 px-3 py-1.5 backdrop-blur-md">
                    <Sparkles className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-xs">Search & Filters</span>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <h2 className="text-2xl leading-tight font-normal tracking-tight">
                      Search by name,<br />type, or owner.
                    </h2>
                    <span className="chrome-pill flex size-11 shrink-0 items-center justify-center rounded-full transition-transform duration-500 group-hover:scale-110">
                      <ArrowUpRight className="size-5" strokeWidth={1.8} />
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </Reveal>

          {/* Column 3 */}
          <div className="flex h-full flex-col gap-5 md:col-span-4">
            <Reveal className="flex-1" delay={160} parallax={30}>
              <article className="panel group h-full min-h-[260px] cursor-pointer">
                <div className="panel-inner flex flex-col justify-between p-7">
                  <div className="flex w-max items-center gap-2 rounded-full border border-hairline bg-surface-2 px-3 py-1.5">
                    <Users className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-xs">Collaboration</span>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <h2 className="text-xl leading-tight font-normal tracking-tight">
                      Real-time sync<br />across your team.
                    </h2>
                    <span className="chrome-pill flex size-10 shrink-0 items-center justify-center rounded-full transition-transform duration-500 group-hover:scale-110">
                      <ArrowUpRight className="size-4" strokeWidth={1.8} />
                    </span>
                  </div>
                </div>
              </article>
            </Reveal>

            <Reveal className="flex-1" delay={240} parallax={45}>
              <article className="panel group h-full min-h-[260px] cursor-pointer">
                <div className="panel-inner flex flex-col justify-between p-7">
                  <div className="flex w-max items-center gap-2 rounded-full border border-hairline bg-surface-2 px-3 py-1.5">
                    <Layers className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-xs">Integrations</span>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <h2 className="text-xl leading-tight font-normal tracking-tight">
                      Connect Slack,<br />Figma & API keys.
                    </h2>
                    <span className="chrome-pill flex size-10 shrink-0 items-center justify-center rounded-full transition-transform duration-500 group-hover:scale-110">
                      <ArrowUpRight className="size-4" strokeWidth={1.8} />
                    </span>
                  </div>
                </div>
              </article>
            </Reveal>
          </div>
        </section>

        {/* Utility bar */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: Link2, label: "Public links · expiry + password", cta: "Manage", href: "/shared" },
            { icon: Star, label: "Starred · 6 items", cta: "View", href: "/files" },
            { icon: Trash2, label: "Trash · 30-day retention, 12 items", cta: "Open", href: "/trash" },
          ].map(({ icon: Icon, label, cta, href }, i) => (
            <Reveal key={label} delay={i * 90}>
              <div className="flex items-center justify-between rounded-2xl border border-hairline bg-surface px-6 py-4 transition-colors duration-300 hover:bg-surface-2">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="size-4" strokeWidth={1.5} /> {label}
                </span>
                <Link href={href} className="text-xs text-muted-foreground transition-colors duration-300 hover:text-foreground">
                  {cta} →
                </Link>
              </div>
            </Reveal>
          ))}
        </section>

        {/* Recent files */}
        <section className="mt-28">
          <Reveal>
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="mb-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Activity stream</p>
                <h2 className="text-3xl font-light tracking-tight md:text-4xl">Recent files</h2>
              </div>
              <Link
                href="/files"
                className="hidden text-xs text-muted-foreground transition-colors duration-300 hover:text-foreground md:block"
              >
                Open file browser →
              </Link>
            </div>
          </Reveal>

          <div className="overflow-hidden rounded-3xl border border-hairline bg-surface backdrop-blur-xl">
            {recentFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Cloud className="size-8 mb-3 opacity-30 animate-pulse" />
                <p className="text-sm font-mono">No recent files</p>
                <p className="text-xs">Drag and drop or click upload to start</p>
              </div>
            ) : (
              recentFiles.map((f, i) => (
                <Reveal key={f.id} delay={i * 70}>
                  <div className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-hairline px-6 py-5 transition-colors duration-300 last:border-b-0 hover:bg-surface-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                    <span className="truncate font-mono text-sm">{f.name}</span>
                    <span className="hidden text-xs text-muted-foreground md:block">{f.mimeType}</span>
                    <span className="hidden text-xs text-muted-foreground md:block">{formatBytes(f.sizeBytes)}</span>
                    <span className="hidden text-xs text-muted-foreground md:block">Me</span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      {new Date(f.createdAt).toLocaleDateString()}
                      <ArrowUpRight
                        className="size-4 -translate-x-1 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100"
                        strokeWidth={1.5}
                      />
                    </span>
                  </div>
                </Reveal>
              ))
            )}
          </div>
        </section>

        {/* Pillars */}
        <section className="mt-28 grid grid-cols-1 gap-5 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 110} parallax={40}>
              <article className="panel h-full">
                <div className="panel-inner flex h-full flex-col gap-4 p-8">
                  <Icon className="size-5 text-muted-foreground" strokeWidth={1.3} />
                  <h3 className="text-xl font-normal tracking-tight">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </section>

        {/* Closing */}
        <Reveal className="mt-32 mb-16" parallax={30}>
          <section className="panel">
            <div className="panel-inner flex flex-col items-center gap-6 px-8 py-20 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,oklch(1_0_0/12%)_0%,transparent_60%)]" />
              <p className="relative font-mono text-[11px] tracking-widest text-muted-foreground uppercase">2 TB · 3 regions · zero plaintext</p>
              <h2 className="relative max-w-2xl text-4xl leading-tight font-light tracking-tight md:text-5xl">
                Your drive, rendered like a control room.
              </h2>
              <Link
                href="/files"
                className="sheen relative mt-2 flex h-[52px] items-center gap-2 overflow-hidden rounded-full border border-hairline bg-secondary px-7 text-sm font-medium transition-transform duration-500 hover:-translate-y-0.5"
              >
                <Upload className="relative z-10 size-4" strokeWidth={1.6} />
                <span className="relative z-10">Start uploading</span>
              </Link>
            </div>
          </section>
        </Reveal>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-hairline py-8 text-xs text-muted-foreground md:flex-row">
          <span className="flex items-center gap-2">
            <Cloud className="size-4" strokeWidth={1.4} /> CloudFS
          </span>
          <span className="font-mono">All systems nominal · edge sync 12 ms</span>
        </footer>
      </main>
    </div>
  );
}