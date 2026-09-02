"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

export function ShareModal({ onClose, target }: { onClose: () => void, target: { type: "file" | "folder"; id: string } | null }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [status, setStatus] = useState("");
  const queryClient = useQueryClient();

  const { data: sharesData, isLoading } = useQuery({
    queryKey: ["shares", target?.type, target?.id],
    queryFn: () => target ? api.shares(target.type, target.id) : Promise.resolve({ shares: [] }),
    enabled: !!target,
  });

  const shares = sharesData?.shares ?? [];

  async function handleGrant() {
    if (!target) return;
    try {
      await api.createShare({
        resourceType: target.type,
        resourceId: target.id,
        granteeUserId: email,
        role,
      });
      setStatus("Share created.");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["shares", target.type, target.id] });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Share failed");
    }
  }

  async function handleRevoke(shareId: string) {
    if (!target) return;
    try {
      await api.deleteShare(shareId);
      queryClient.invalidateQueries({ queryKey: ["shares", target.type, target.id] });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Revoke failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-hairline bg-[oklch(0.11_0_0)] p-8" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Share</p>
        <h2 className="mb-6 text-2xl font-light tracking-tight">Manage access</h2>
        
        {/* Access List */}
        <div className="mb-6 flex flex-col gap-2 border-b border-hairline pb-6">
          <h3 className="text-sm font-medium">Who has access</h3>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : shares.length === 0 ? (
            <p className="text-xs text-muted-foreground">Not shared with anyone yet.</p>
          ) : (
            shares.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-hairline bg-surface p-3">
                <div>
                  <p className="text-sm font-medium">{s.granteeUserId}</p>
                  <p className="text-xs text-muted-foreground capitalize">{s.role}</p>
                </div>
                <button
                  onClick={() => handleRevoke(s.id)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-surface-2 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Grant New */}
        <h3 className="mb-3 text-sm font-medium">Grant new access</h3>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm outline-none"
          placeholder="User UUID or Email"
        />
        <div className="mb-6 flex gap-2">
          {(["viewer", "editor"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-full px-4 py-1.5 text-xs ${role === r ? "bg-surface-2" : "border border-hairline"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          className="sheen relative h-[48px] w-full overflow-hidden rounded-full border border-hairline bg-secondary text-sm disabled:opacity-50"
          onClick={handleGrant}
          disabled={!email || !target}
        >
          Grant access
        </button>
        <p className="mt-3 font-mono text-xs text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
