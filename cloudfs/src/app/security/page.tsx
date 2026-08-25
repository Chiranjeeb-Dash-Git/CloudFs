"use client";

import { ArrowUpRight, Bell, Cloud, Globe, Lock, LogOut, Search, Shield, ShieldCheck, Smartphone, User, Wifi } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { WaveTerrain } from "@/components/WaveTerrain";
import { Nav } from "@/components/Nav";

const sessions = [
  { device: "MacBook Pro", browser: "Chrome 126", location: "San Francisco, CA", ip: "192.168.1.45", current: true, lastActive: "now" },
  { device: "iPhone 15 Pro", browser: "Safari", location: "San Francisco, CA", ip: "192.168.1.45", current: false, lastActive: "2h ago" },
  { device: "Windows Desktop", browser: "Firefox 127", location: "New York, NY", ip: "10.0.0.12", current: false, lastActive: "3d ago" },
  { device: "iPad Air", browser: "Safari", location: "London, UK", ip: "172.16.0.88", current: false, lastActive: "1w ago" },
];

const oauthAccounts = [
  { provider: "Google", email: "alex.k@company.com", connected: true },
  { provider: "GitHub", email: "alexk-dev", connected: true },
  { provider: "Microsoft", email: "alex.k@enterprise.com", connected: false },
];

export default function SecurityPage() {
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
            </div>
          </header>
        </Reveal>

        {/* Active Sessions */}
        <Reveal className="mb-12" delay={60}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-normal tracking-tight">Active Sessions</h2>
            <span className="text-sm text-muted-foreground">4 active sessions</span>
          </div>
          <div className="overflow-hidden rounded-3xl border border-hairline bg-surface backdrop-blur-xl">
            {sessions.map((session, i) => (
              <Reveal key={session.device} delay={i * 70}>
                <div className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-hairline px-6 py-5 transition-colors duration-300 last:border-b-0 hover:bg-surface-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto_auto]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{session.device}</span>
                      {session.current && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary">Current</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{session.browser} · {session.location}</p>
                  </div>
                  <span className="hidden text-xs text-muted-foreground md:block">{session.ip}</span>
                  <span className="hidden text-xs text-muted-foreground md:block">{session.lastActive}</span>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-green-500" strokeWidth={2} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {!session.current && (
                      <button className="flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors">
                        <LogOut className="size-3.5" /> Revoke
                      </button>
                    )}
                    <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100" strokeWidth={1.5} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* Security Settings */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Reveal className="mb-6" delay={120} parallax={20}>
            <article className="panel h-full">
              <div className="panel-inner flex flex-col gap-4 p-7">
                <div className="flex items-center gap-3">
                  <Lock className="size-5 text-muted-foreground" strokeWidth={1.3} />
                  <h3 className="text-xl font-normal tracking-tight">Password</h3>
                </div>
                <p className="text-sm text-muted-foreground">Last changed 45 days ago</p>
                <button className="mt-4 flex w-full items-center justify-between rounded-full border border-hairline bg-surface-2 px-4 py-2.5 transition-colors duration-300 hover:bg-accent">
                  <span className="text-xs">Change password</span>
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
                <p className="text-sm text-muted-foreground">TOTP authenticator app enabled</p>
                <button className="mt-4 flex w-full items-center justify-between rounded-full border border-hairline bg-surface-2 px-4 py-2.5 transition-colors duration-300 hover:bg-accent">
                  <span className="text-xs">Manage 2FA</span>
                  <ArrowUpRight className="size-4" strokeWidth={1.5} />
                </button>
              </div>
            </article>
          </Reveal>

          <Reveal className="mb-6" delay={200} parallax={30}>
            <article className="panel h-full md:col-span-2">
              <div className="panel-inner flex flex-col gap-4 p-7">
                <div className="flex items-center gap-3">
                  <Globe className="size-5 text-muted-foreground" strokeWidth={1.3} />
                  <h3 className="text-xl font-normal tracking-tight">Connected Accounts</h3>
                </div>
                <div className="space-y-3">
                  {oauthAccounts.map((account) => (
                    <div key={account.provider} className="flex items-center justify-between rounded-full border border-hairline bg-surface-2 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex size-10 items-center justify-center rounded-full ${account.connected ? "bg-primary/10" : "bg-surface"}`}>
                          {account.provider === "Google" && <iconify-icon icon="solar:google-logo-linear" className={`size-5 ${account.connected ? "text-primary" : "text-muted-foreground"}`} />}
                          {account.provider === "GitHub" && <iconify-icon icon="solar:github-logo-linear" className={`size-5 ${account.connected ? "text-primary" : "text-muted-foreground"}`} />}
                          {account.provider === "Microsoft" && <iconify-icon icon="solar:microsoft-logo-linear" className={`size-5 ${account.connected ? "text-primary" : "text-muted-foreground"}`} />}
                        </div>
                        <div>
                          <p className="font-mono text-sm">{account.provider}</p>
                          <p className="text-xs text-muted-foreground">{account.email}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-mono ${account.connected ? "text-green-500" : "text-muted-foreground"}`}>
                        {account.connected ? "Connected" : "Connect"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </Reveal>

          <Reveal className="mb-6" delay={240} parallax={35}>
            <article className="panel h-full md:col-span-2">
              <div className="panel-inner flex flex-col gap-4 p-7">
                <div className="flex items-center gap-3">
                  <Wifi className="size-5 text-muted-foreground" strokeWidth={1.3} />
                  <h3 className="text-xl font-normal tracking-tight">Revoke All Sessions</h3>
                </div>
                <p className="text-sm text-muted-foreground">Sign out of all devices except the current one. You'll need to sign in again on other devices.</p>
                <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-destructive bg-transparent px-4 py-2.5 text-xs text-destructive transition-colors duration-300 hover:bg-destructive/10">
                  <LogOut className="size-3.5" /> Revoke All Other Sessions
                </button>
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