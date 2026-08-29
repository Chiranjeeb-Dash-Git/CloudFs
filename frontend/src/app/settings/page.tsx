"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Bell, Cloud, Globe, HardDrive, Shield, User, Wifi } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Reveal } from "@/components/Reveal";
import { WaveTerrain } from "@/components/WaveTerrain";
import { Nav } from "@/components/Nav";

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: meData, error: meError, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
  });

  const { data: storageData } = useQuery({
    queryKey: ["storage"],
    queryFn: api.storage,
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.getNotifications,
  });

  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [notifState, setNotifState] = useState({
    share: true,
    security: true,
    email: false,
  });

  useEffect(() => {
    if (meError) {
      router.push("/login");
    }
  }, [meError, router]);

  useEffect(() => {
    if (meData?.user?.name) {
      setName(meData.user.name);
    }
  }, [meData]);

  useEffect(() => {
    if (notifData?.notifications) {
      setNotifState((prev) => ({ ...prev, ...notifData.notifications }));
    }
  }, [notifData]);

  const user = meData?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg("");
    try {
      await api.updateProfile({ name });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setProfileMsg("Profile updated successfully");
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleToggleNotif(key: "share" | "security" | "email", val: boolean) {
    const updated = { ...notifState, [key]: val };
    setNotifState(updated);
    try {
      await api.updateNotifications({ [key]: val });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (err) {
      console.error("Failed to update notifications:", err);
    }
  }

  async function handleSignOutEverywhere() {
    try {
      await api.deleteAllSessions();
      router.push("/login");
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  }

  if (meLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[oklch(0.05_0_0)] text-white font-mono text-sm tracking-widest animate-pulse">
        LOADING SETTINGS...
      </div>
    );
  }

  const usedBytes = storageData?.usedBytes ?? 0;
  const quotaBytes = storageData?.quotaBytes ?? 16106127360;
  const percentUsed = storageData?.percentUsed ?? Math.round((usedBytes / quotaBytes) * 100);
  const plan = storageData?.plan ?? "free";

  return (
    <div className="theme-mono relative min-h-screen overflow-x-hidden text-foreground">
      <WaveTerrain />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,oklch(1_0_0/8%)_0%,transparent_55%)]" />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1280px] flex-col px-6 py-10">
        <Nav theme="mono" showUpload={false} />

        <Reveal className="mb-12">
          <header className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="mb-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Settings</p>
              <h1 className="text-4xl font-light tracking-tight md:text-5xl">Account Settings</h1>
            </div>
          </header>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Profile */}
          <Reveal className="md:col-span-2" delay={60} parallax={20}>
            <article className="panel h-full">
              <div className="panel-inner flex flex-col gap-6 p-7">
                <h2 className="text-xl font-normal tracking-tight">Profile</h2>
                
                <form onSubmit={handleSaveProfile} className="flex items-center gap-6">
                  <div className="relative shrink-0">
                    <div className="chrome-pill flex size-24 items-center justify-center rounded-full text-2xl font-semibold">
                      {initials}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="block mb-1 text-xs text-muted-foreground">Display Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-muted-foreground">Email</label>
                        <input
                          type="email"
                          value={user?.email ?? ""}
                          disabled
                          className="w-full rounded-full border border-hairline bg-surface/50 px-4 py-2.5 text-sm text-muted-foreground outline-none cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="sheen relative flex h-[44px] items-center gap-2 overflow-hidden rounded-full border border-hairline bg-secondary px-5 text-sm font-medium transition-transform duration-500 hover:-translate-y-0.5 disabled:opacity-50"
                      >
                        <ArrowUpRight className="relative z-10 size-4" strokeWidth={1.6} />
                        <span className="relative z-10">{savingProfile ? "Saving…" : "Save Changes"}</span>
                      </button>
                      {profileMsg && (
                        <span className="font-mono text-xs text-muted-foreground">{profileMsg}</span>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </article>
          </Reveal>

          {/* Storage Plan */}
          <Reveal delay={100} parallax={25}>
            <article className="panel h-full">
              <div className="panel-inner flex flex-col gap-4 p-7">
                <div className="flex items-center gap-3">
                  <HardDrive className="size-5 text-muted-foreground" strokeWidth={1.3} />
                  <h3 className="text-xl font-normal tracking-tight">Storage Plan</h3>
                </div>
                <div className="relative">
                  <div className="mb-2 flex items-end justify-between">
                    <span className="font-mono text-3xl font-light">{formatBytes(usedBytes)}</span>
                    <span className="font-mono text-xs text-muted-foreground">of {formatBytes(quotaBytes)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, percentUsed)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{percentUsed.toFixed(1)}% used</p>
                </div>
                <button
                  type="button"
                  onClick={() => alert(`${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan: ${formatBytes(quotaBytes)} quota active.`)}
                  className="mt-4 flex w-full items-center justify-between rounded-full border border-hairline bg-surface-2 px-4 py-2.5 transition-colors duration-300 hover:bg-accent"
                >
                  <span className="text-xs">Current Plan: {plan.charAt(0).toUpperCase() + plan.slice(1)} ({formatBytes(quotaBytes)})</span>
                  <ArrowUpRight className="size-4" strokeWidth={1.5} />
                </button>
              </div>
            </article>
          </Reveal>

          {/* Notifications */}
          <Reveal delay={140} parallax={30}>
            <article className="panel h-full">
              <div className="panel-inner flex flex-col gap-4 p-7">
                <div className="flex items-center gap-3">
                  <Bell className="size-5 text-muted-foreground" strokeWidth={1.3} />
                  <h3 className="text-xl font-normal tracking-tight">Notifications</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { key: "share" as const, label: "File activity", desc: "When files are shared or modified" },
                    { key: "security" as const, label: "Security alerts", desc: "New sign-ins and 2FA updates" },
                    { key: "email" as const, label: "Email notifications", desc: "Product updates and weekly digest" },
                  ].map((notif) => (
                    <label key={notif.key} className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="font-mono text-sm">{notif.label}</p>
                        <p className="text-xs text-muted-foreground">{notif.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifState[notif.key]}
                        onChange={(e) => handleToggleNotif(notif.key, e.target.checked)}
                        className="size-4 rounded border-hairline bg-surface accent-primary focus:ring-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </article>
          </Reveal>

          {/* Appearance */}
          <Reveal delay={180} parallax={35}>
            <article className="panel h-full md:col-span-2">
              <div className="panel-inner flex flex-col gap-4 p-7">
                <div className="flex items-center gap-3">
                  <Globe className="size-5 text-muted-foreground" strokeWidth={1.3} />
                  <h3 className="text-xl font-normal tracking-tight">Appearance</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {["System", "Light", "Dark"].map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      className="rounded-full border border-hairline bg-surface px-4 py-3 text-sm transition-colors duration-300 hover:bg-surface-2"
                    >
                      {theme}
                    </button>
                  ))}
                </div>
                <div className="pt-4 space-y-3">
                  {[
                    { label: "Reduced motion", desc: "Disable non-essential animations", enabled: false },
                    { label: "Compact density", desc: "Reduce spacing for more content", enabled: false },
                  ].map((item) => (
                    <label key={item.label} className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="font-mono text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={item.enabled}
                        className="size-4 rounded border-hairline bg-surface accent-primary focus:ring-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </article>
          </Reveal>

          {/* Danger Zone */}
          <Reveal delay={220} parallax={40}>
            <article className="panel h-full md:col-span-2">
              <div className="panel-inner flex flex-col gap-4 p-7">
                <div className="flex items-center gap-3">
                  <Shield className="size-5 text-destructive" strokeWidth={1.3} />
                  <h3 className="text-xl font-normal tracking-tight text-destructive">Danger Zone</h3>
                </div>
                <p className="text-sm text-muted-foreground">Irreversible actions. Please proceed with caution.</p>
                <div className="space-y-3 pt-4 border-t border-hairline">
                  <button
                    type="button"
                    onClick={handleSignOutEverywhere}
                    className="flex w-full items-center justify-between rounded-full border border-destructive bg-transparent px-4 py-2.5 text-xs text-destructive transition-colors duration-300 hover:bg-destructive/10"
                  >
                    <span className="flex items-center gap-2">
                      <Wifi className="size-3.5" /> Sign out everywhere
                    </span>
                    <ArrowUpRight className="size-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => alert("Please contact support to initiate account deletion.")}
                    className="flex w-full items-center justify-between rounded-full border border-destructive bg-transparent px-4 py-2.5 text-xs text-destructive transition-colors duration-300 hover:bg-destructive/10"
                  >
                    <span className="flex items-center gap-2">
                      <User className="size-3.5" /> Delete account
                    </span>
                    <ArrowUpRight className="size-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </article>
          </Reveal>
        </div>

        <footer className="mt-auto flex flex-col items-center justify-between gap-3 border-t border-hairline py-8 text-xs text-muted-foreground md:flex-row">
          <span className="flex items-center gap-2">
            <Cloud className="size-4" strokeWidth={1.4} /> CloudFS
          </span>
          <span className="font-mono">All systems nominal · edge sync 12 ms</span>
        </footer>
      </main>
    </div>
  );
}