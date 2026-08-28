"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export function FolderModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const queryClient = useQueryClient();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-hairline bg-[oklch(0.11_0_0)] p-8" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">New folder</p>
        <h2 className="mb-6 text-2xl font-light tracking-tight">Name this collection</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-6 w-full rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm outline-none"
          placeholder="Folder name"
        />
        <button
          className="sheen relative h-[48px] w-full overflow-hidden rounded-full border border-hairline bg-secondary text-sm"
          onClick={async () => {
            try {
              await api.createFolder({ name, parentId: null });
              setStatus("Folder created.");
              queryClient.invalidateQueries({ queryKey: ["search"] });
              queryClient.invalidateQueries({ queryKey: ["folder"] });
              onClose();
            } catch (err) {
              setStatus(err instanceof Error ? err.message : "Could not create folder");
            }
          }}
        >
          Create
        </button>
        <p className="mt-3 font-mono text-xs text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
