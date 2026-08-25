"use client";

import { ArrowUpRight, Check, Cloud, Lock, Shield, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { WaveTerrain } from "@/components/WaveTerrain";

export default function LandingPage() {
  const features = [
    { icon: Lock, title: "Encrypted at Rest", desc: "AES-256 envelope keys rotated every 30 days. Nothing leaves a region unencrypted." },
    { icon: Shield, title: "Mirrored 3 Regions", desc: "Every write lands in three isolated zones before acknowledgment." },
    { icon: Users, title: "Live Presence", desc: "See cursors, locks and version branches the moment a teammate opens a file." },
    { icon: Zap, title: "Instant Search", desc: "Full-text + fuzzy search across names, types, owners — powered by pg_trgm." },
    { icon: Cloud, title: "Smart Uploads", desc: "Presigned multipart for large files, drag-drop for small. Resume on failure." },
    { icon: Check, title: "Granular Sharing", desc: "Viewer/Editor roles, expiring public links, optional passwords, audit log." },
  ];

  const stats = [
    { value: "2 TB", label: "Encrypted Storage" },
    { value: "3", label: "Mirrored Regions" },
    { value: "0", label: "Plaintext Bytes" },
    { value: "99.99%", label: "Uptime SLA" },
  ];

  return (
    <div className="theme-nexacore relative min-h-screen overflow-x-hidden text-foreground font-mono">
      <WaveTerrain />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.43_0.26_300/0.15)_0%,transparent_60%)]" />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1280px] flex-col px-6 py-20">
        {/* Nav */}
        <nav className="mb-16 flex w-full items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cloud className="size-5 opacity-85" strokeWidth={1.4} />
            <span className="text-base font-medium tracking-tight">CloudFS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="sheen relative flex h-[52px] items-center gap-2 overflow-hidden rounded-full border border-border bg-secondary px-6 text-sm font-medium transition-transform duration-500 hover:-translate-y-0.5"
            >
              <ArrowUpRight className="relative z-10 size-4" strokeWidth={1.6} />
              <span className="relative z-10">Get Started</span>
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <Reveal className="mb-20 text-center" parallax={30}>
          <div className="max-w-4xl mx-auto">
            <p className="mb-6 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">FOUNDED 2024</p>
            <h1 className="mb-8 text-5xl font-light tracking-tight md:text-7xl lg:text-8xl">
              Anomaly<br />
              <span className="text-primary">Resolution</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
              CloudFS is a cinematic cloud drive: 2 TB encrypted storage, real-time team sync, expiring share links and mirrored regions.
            </p>
            <div className="mt-12 flex items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="sheen relative flex h-[56px] items-center gap-2 overflow-hidden rounded-full border border-border bg-primary px-8 text-base font-medium transition-transform duration-500 hover:-translate-y-0.5"
              >
                <ArrowUpRight className="relative z-10 size-4" strokeWidth={1.6} />
                <span className="relative z-10">Launch Dashboard</span>
              </Link>
              <Link
                href="#features"
                className="flex h-[56px] items-center gap-2 rounded-full border border-border bg-transparent px-8 text-base font-medium transition-colors hover:bg-secondary"
              >
                Explore Features
              </Link>
            </div>
          </div>
        </Reveal>

        {/* Stats */}
        <Reveal className="mb-20" delay={100}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80} className="text-center">
                <div className="mb-2 text-4xl font-light tracking-tight md:text-6xl">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* Bento Preview Grid */}
        <Reveal className="mb-20" delay={200}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:h-[500px]">
            <Reveal className="md:col-span-6" delay={60} parallax={20}>
              <article className="panel h-full min-h-[300px]">
                <div className="panel-inner flex flex-col justify-between p-8">
                  <div className="flex items-start justify-between">
                    <h2 className="w-3/4 text-xl font-normal tracking-tight">Storage Overview</h2>
                    <Cloud className="size-5 text-muted-foreground" strokeWidth={1.3} />
                  </div>
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="font-mono text-6xl md:text-8xl font-light">1.52 TB</div>
                    <div className="flex items-end justify-between">
                      <span className="font-mono text-xs text-muted-foreground">482 GB used of 2 TB</span>
                      <div className="flex size-10 items-center justify-center rounded-full border border-border bg-secondary">
                        <Zap className="size-5" strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>

            <Reveal className="md:col-span-6" delay={140} parallax={30}>
              <article className="panel h-full min-h-[300px]">
                <div className="panel-inner flex flex-col justify-between p-8">
                  <div className="flex items-start justify-between">
                    <h2 className="w-3/4 text-xl font-normal tracking-tight">Live Collaboration</h2>
                    <Users className="size-5 text-muted-foreground" strokeWidth={1.3} />
                  </div>
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="float-slow relative h-40 w-40 transition-transform duration-700">
                      <svg viewBox="0 0 160 160" className="h-full w-full" fill="none">
                        <defs>
                          <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#6D5DFB" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#6D5DFB" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        <circle cx="80" cy="80" r="70" fill="url(#orbGlow)" />
                        <circle cx="80" cy="80" r="55" stroke="#6D5DFB" strokeWidth="1.5" fill="none" strokeDasharray="8 4" />
                      </svg>
                    </div>
                    <div className="flex items-end justify-between">
                      <h3 className="text-xl font-normal tracking-tight">3 active collaborators</h3>
                      <div className="flex size-10 items-center justify-center rounded-full border border-border bg-secondary">
                        <ArrowUpRight className="size-5" strokeWidth={1.8} />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>

            <Reveal className="md:col-span-4" delay={100} parallax={20}>
              <article className="panel h-full min-h-[240px]">
                <div className="panel-inner flex flex-col justify-between p-7">
                  <div className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5">
                    <Shield className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-xs">Security</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <h2 className="text-xl leading-tight font-normal tracking-tight">Encrypted at rest</h2>
                    <ArrowUpRight className="size-4" strokeWidth={1.8} />
                  </div>
                </div>
              </article>
            </Reveal>

            <Reveal className="md:col-span-4" delay={180} parallax={35}>
              <article className="panel h-full min-h-[240px]">
                <div className="panel-inner flex flex-col justify-between p-7">
                  <div className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5">
                    <Zap className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-xs">Performance</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <h2 className="text-xl leading-tight font-normal tracking-tight">Sub-100ms latency</h2>
                    <ArrowUpRight className="size-4" strokeWidth={1.8} />
                  </div>
                </div>
              </article>
            </Reveal>

            <Reveal className="md:col-span-4" delay={260} parallax={45}>
              <article className="panel h-full min-h-[240px]">
                <div className="panel-inner flex flex-col justify-between p-7">
                  <div className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5">
                    <Lock className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-xs">Access</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <h2 className="text-xl leading-tight font-normal tracking-tight">Granular permissions</h2>
                    <ArrowUpRight className="size-4" strokeWidth={1.8} />
                  </div>
                </div>
              </article>
            </Reveal>
          </div>
        </Reveal>

        {/* Features */}
        <section id="features" className="mb-20">
          <Reveal>
            <div className="mb-12 text-center">
              <p className="mb-4 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Core Capabilities</p>
              <h2 className="text-4xl font-light tracking-tight md:text-5xl">Built for teams that ship</h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 80} parallax={20}>
                <article className="panel group h-full p-7 transition-colors duration-300 hover:bg-surface-2">
                  <feature.icon className="mb-4 size-5 text-muted-foreground" strokeWidth={1.3} />
                  <h3 className="mb-2 text-xl font-normal tracking-tight">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <Reveal className="mb-16" parallax={30}>
          <section className="panel">
            <div className="panel-inner flex flex-col items-center gap-6 px-8 py-20 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,oklch(0.43_0.26_300/0.15)_0%,transparent_60%)]" />
              <p className="relative font-mono text-[11px] tracking-widest text-muted-foreground uppercase">2 TB · 3 regions · zero plaintext</p>
              <h2 className="relative max-w-2xl text-4xl leading-tight font-light tracking-tight md:text-5xl">
                Your drive, rendered like a control room.
              </h2>
              <Link
                href="/dashboard"
                className="sheen relative mt-2 flex h-[52px] items-center gap-2 overflow-hidden rounded-full border border-border bg-primary px-7 text-sm font-medium transition-transform duration-500 hover:-translate-y-0.5"
              >
                <ArrowUpRight className="relative z-10 size-4" strokeWidth={1.6} />
                <span className="relative z-10">Start uploading</span>
              </Link>
            </div>
          </section>
        </Reveal>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-border py-8 text-xs text-muted-foreground md:flex-row">
          <span className="flex items-center gap-2">
            <Cloud className="size-4" strokeWidth={1.4} /> CloudFS
          </span>
          <span className="font-mono">All systems nominal · edge sync 12 ms</span>
        </footer>
      </main>
    </div>
  );
}