"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export function LinkShareModal({ onClose, target }: { onClose: () => void, target: { type: "file" | "folder"; id: string } | null }) {
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>("0");
  const [status, setStatus] = useState("");
  const [createdLink, setCreatedLink] = useState("");

  async function handleCreate() {
    if (!target) return;
    try {
      setStatus("Creating...");
      let expiresAt: string | undefined = undefined;
      if (expiresIn !== "0") {
        const days = parseInt(expiresIn);
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }
      
      const res = await api.createLink({
        resourceType: target.type,
        resourceId: target.id,
        password: password || undefined,
        expiresAt
      });
      
      const url = `${window.location.origin}/link/${res.link.token}`;
      setCreatedLink(url);
      setStatus("Link created!");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to create link");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-hairline bg-[oklch(0.11_0_0)] p-8" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Public Link</p>
        <h2 className="mb-6 text-2xl font-light tracking-tight">Share via link</h2>
        
        {createdLink ? (
          <div className="flex flex-col gap-4">
            <input 
              readOnly 
              value={createdLink} 
              className="w-full rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm outline-none text-center text-foreground bg-transparent" 
            />
            <button
              onClick={() => { navigator.clipboard.writeText(createdLink); setStatus("Copied to clipboard!"); }}
              className="sheen relative h-[48px] w-full overflow-hidden rounded-full border border-hairline bg-secondary text-sm"
            >
              Copy Link
            </button>
            <p className="mt-3 font-mono text-xs text-muted-foreground text-center">{status}</p>
          </div>
        ) : (
          <>
            <label className="mb-3 block text-xs text-muted-foreground">Optional Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 w-full rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm outline-none"
              placeholder="Leave blank for open access"
            />
            
            <label className="mb-3 block text-xs text-muted-foreground">Expires In</label>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="mb-6 w-full rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm outline-none appearance-none"
            >
              <option value="0">Never</option>
              <option value="1">1 Day</option>
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
            </select>
            
            <button
              className="sheen relative h-[48px] w-full overflow-hidden rounded-full border border-hairline bg-secondary text-sm disabled:opacity-50"
              onClick={handleCreate}
              disabled={!target}
            >
              Generate Link
            </button>
            <p className="mt-3 font-mono text-xs text-muted-foreground text-center">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}
