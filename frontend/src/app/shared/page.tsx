"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Cloud, Link2, Trash2, UserCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Reveal } from "@/components/Reveal";
import { WaveTerrain } from "@/components/WaveTerrain";
import { Nav } from "@/components/Nav";

export default function SharedPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"inbox" | "outbox" | "links">("inbox");

  const { data: meData, error: meError, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
  });

  useEffect(() => {
    if (meError) router.push("/login");
  }, [meError, router]);

  const { data: inboxData } = useQuery({
    queryKey: ["sharesInbox"],
    queryFn: api.sharesInbox,
    enabled: tab === "inbox",
  });

  const { data: outboxData } = useQuery({
    queryKey: ["sharesOutbox"],
    queryFn: api.sharesOutbox,
    enabled: tab === "outbox",
  });

  const { data: linksData } = useQuery({
    queryKey: ["linksList"],
    queryFn: api.linksList,
    enabled: tab === "links",
  });

  const handleRevokeLink = async (id: string) => {
    try {
      await api.deleteLink(id);
      queryClient.invalidateQueries({ queryKey: ["linksList"] });
    } catch (err) {
      console.error(err);
    }
  };

  const inboxItems = inboxData?.items ?? [];
  const outboxItems = outboxData?.items ?? [];
  const linkItems = linksData?.links ?? [];

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

        <Reveal className="mb-8">
          <header className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="mb-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Sharing</p>
              <h1 className="text-4xl font-light tracking-tight md:text-5xl">Shared Hub</h1>
            </div>
          </header>
        </Reveal>

        {/* Tabs */}
        <Reveal className="mb-8" delay={50}>
          <div className="flex gap-2 border-b border-hairline pb-4">
            <button
              onClick={() => setTab("inbox")}
              className={`rounded-full px-5 py-2 text-xs font-mono transition-colors ${tab === "inbox" ? "bg-primary text-black font-semibold" : "bg-surface-2 text-muted-foreground hover:text-foreground"}`}
            >
              Shared with me ({inboxItems.length})
            </button>
            <button
              onClick={() => setTab("outbox")}
              className={`rounded-full px-5 py-2 text-xs font-mono transition-colors ${tab === "outbox" ? "bg-primary text-black font-semibold" : "bg-surface-2 text-muted-foreground hover:text-foreground"}`}
            >
              Shared by me ({outboxItems.length})
            </button>
            <button
              onClick={() => setTab("links")}
              className={`rounded-full px-5 py-2 text-xs font-mono transition-colors ${tab === "links" ? "bg-primary text-black font-semibold" : "bg-surface-2 text-muted-foreground hover:text-foreground"}`}
            >
              Public Links ({linkItems.length})
            </button>
          </div>
        </Reveal>

        {/* Tab Content */}
        <Reveal className="mb-12" delay={100}>
          <div className="overflow-hidden rounded-3xl border border-hairline bg-surface backdrop-blur-xl">
            {tab === "inbox" && (
              inboxItems.length === 0 ? (
                <div className="p-12 text-center text-sm font-mono text-muted-foreground">
                  No files shared with you yet.
                </div>
              ) : (
                inboxItems.map((f: any, i: number) => (
                  <div key={f.id} className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-hairline px-6 py-5 transition-colors last:border-b-0 hover:bg-surface-2 md:grid-cols-[2fr_1fr_1fr_auto]">
                    <span className="truncate font-mono text-sm">{f.name}</span>
                    <span className="hidden text-xs text-muted-foreground md:block">{"mimeType" in f ? f.mimeType : "Folder"}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-mono text-blue-400 w-fit">
                      <Users className="size-3" /> Shared Access
                    </span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      <ArrowUpRight className="size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </div>
                ))
              )
            )}

            {tab === "outbox" && (
              outboxItems.length === 0 ? (
                <div className="p-12 text-center text-sm font-mono text-muted-foreground">
                  You haven't shared any files with specific users yet.
                </div>
              ) : (
                outboxItems.map((s: any, i: number) => (
                  <div key={s.id} className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-hairline px-6 py-5 transition-colors last:border-b-0 hover:bg-surface-2 md:grid-cols-[2fr_1fr_1fr_auto]">
                    <span className="truncate font-mono text-sm">{s.resourceId}</span>
                    <span className="hidden text-xs text-muted-foreground md:block">Grantee: {s.granteeUserId}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-mono text-purple-400 w-fit capitalize">
                      Role: {s.role}
                    </span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      <UserCheck className="size-4 opacity-50" />
                    </span>
                  </div>
                ))
              )
            )}

            {tab === "links" && (
              linkItems.length === 0 ? (
                <div className="p-12 text-center text-sm font-mono text-muted-foreground">
                  No active public links.
                </div>
              ) : (
                linkItems.map((l: any, i: number) => (
                  <div key={l.token} className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-hairline px-6 py-5 transition-colors last:border-b-0 hover:bg-surface-2 md:grid-cols-[2fr_1fr_1fr_auto]">
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-mono text-sm">{l.resourceType}: {l.resourceId}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Token: {l.token}</span>
                    </div>
                    <span className="hidden text-xs text-muted-foreground md:block">
                      {l.expiresAt ? `Expires: ${new Date(l.expiresAt).toLocaleDateString()}` : "Never expires"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-mono text-green-400 w-fit">
                      <Link2 className="size-3" /> {l.hasPassword ? "Password protected" : "Public"}
                    </span>
                    <button
                      onClick={() => handleRevokeLink(l.token)}
                      className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
                      title="Revoke Link"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))
              )
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