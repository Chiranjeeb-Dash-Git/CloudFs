"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export function ShareModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [status, setStatus] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-hairline bg-[oklch(0.11_0_0)] p-8" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Share</p>
        <h2 className="mb-6 text-2xl font-light tracking-tight">Invite with a role</h2>
        <label className="mb-3 block text-xs text-muted-foreground">Grantee user id or email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm outline-none"
          placeholder="user uuid"
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
          className="sheen relative h-[48px] w-full overflow-hidden rounded-full border border-hairline bg-secondary text-sm"
          onClick={async () => {
            try {
              await api.createShare({
                resourceType: "folder",
                resourceId: "root",
                granteeUserId: email,
                role,
              });
              setStatus("Share created.");
            } catch (err) {
              setStatus(err instanceof Error ? err.message : "Share failed");
            }
          }}
        >
          Grant access
        </button>
        <p className="mt-3 font-mono text-xs text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
