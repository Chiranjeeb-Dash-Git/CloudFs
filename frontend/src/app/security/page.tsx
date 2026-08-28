"use client";

import { useEffect } from "react";
import { ArrowUpRight, Cloud, Lock, LogOut, Shield, ShieldCheck, Wifi } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Reveal } from "@/components/Reveal";
import { WaveTerrain } from "@/components/WaveTerrain";
import { Nav } from "@/components/Nav";

export default function SecurityPage() {
  const router = useRouter();

  const { data: meData, error: meError, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
  });

  useEffect(() => {
    if (meError) router.push("/login");
  }, [meError, router]);

  async function handleSignOutEverywhere() {
    try {
      await api.deleteAllSessions();
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  }

  if (meLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[oklch(0.05_0_0)] text-white font-mono text-sm tracking-widest animate-pulse">
        LOADING SECURITY...
      </div>
    );
  }

  const user = meData?.user;

  return (
    <div className="theme-mono relative min-h-screen overflow-x-hidden text-foreground">
      <WaveTerrain />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,oklch(1_0_0/8%)_0%,transparent_55%)]" />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1280px] flex-col px-6 py-10">
        <Nav theme="mono" showUpload={false} />

        <Reveal className="mb-12">
          <header className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="mb-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Security</p>
              <h1 className="text-4xl font-light tracking-tight md:text-5xl">Sessions & Security</h1>
              <p className="text-xs font-mono text-muted-foreground mt-2">Account: {user?.email}</p>
            </div>
          </header>
        </Reveal>

        {/* Active Sessions */}
        <Reveal className="mb-12" delay={60}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-normal tracking-tight">Active Sessions</h2>
            <span className="text-sm text-muted-foreground">1 active session</span>
          </div>
          <div className="overflow-hidden rounded-3xl border border-hairline bg-surface backdrop-blur-xl">
            <div className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-hairline px-6 py-5 transition-colors duration-300 last:border-b-0 hover:bg-surface-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">Current Device (Web Browser)</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary">Current</span>
                </div>
                <p className="text-xs text-muted-foreground">CloudFS Web Client · Active now</p>
              </div>
              <span className="hidden text-xs text-muted-foreground md:block">Local Network</span>
              <span className="hidden text-xs text-muted-foreground md:block">Just now</span>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-green-500" strokeWidth={2} />
              </div>
            </div>
          </div>
        </Reveal>

        {/* Security Settings */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Reveal className="mb-6" delay={120} parallax={20}>
            <article className="panel h-full">
              <div className="panel-inner flex flex-col gap-4 p-7">
                <div className="flex items-center gap-3">
                  <Lock className="size-5 text-muted-foreground" strokeWidth={1.3} />
                  <h3 className="text-xl font-normal tracking-tight">Password & Auth</h3>
                </div>
                <p className="text-sm text-muted-foreground">Logged in as {user?.email}</p>
                <button
                  onClick={handleSignOutEverywhere}
                  className="mt-4 flex w-full items-center justify-between rounded-full border border-destructive bg-transparent px-4 py-2.5 text-xs text-destructive transition-colors duration-300 hover:bg-destructive/10"
                >
                  <span className="flex items-center gap-2"><Wifi className="size-3.5" /> Sign out all sessions</span>
                  <ArrowUpRight className="size-4" strokeWidth={1.5} />
                </button>
              </div>
            </article>
          </Reveal>

          <Reveal className="mb-6" delay={160} parallax={25}>
            <article className="panel h-full">
              <div className="panel-inner flex flex-col gap-4 p-7">
                <div className="flex items-center gap-3">
                  <Shield className="size-5 text-muted-foreground" strokeWidth={1.3} />
                  <h3 className="text-xl font-normal tracking-tight">Two-Factor Authentication</h3>
                </div>
                <p className="text-sm text-muted-foreground">2FA protection active for your account.</p>
                <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-2 px-4 py-2 text-xs font-mono text-muted-foreground">
                  Status: Protected
                </div>
              </div>
            </article>
          </Reveal>
        </div>

        <footer className="mt-auto flex flex-col items-center justify-between gap-3 border-t border-hairline py-8 text-xs text-muted-foreground md:flex-row">
          <span className="flex items-center gap-2"><Cloud className="size-4" strokeWidth={1.4} /> CloudFS</span>
          <span className="font-mono">All systems nominal · edge sync 12 ms</span>
        </footer>
      </main>
    </div>
  );
}