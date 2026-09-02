"use client";

import { Upload } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export function UploadModal({ onClose, folderId = undefined }: { onClose: () => void, folderId?: string }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        setStatus(`Init ${file.name}…`);
        const init = await api.uploadInit({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          folderId: folderId || null,
        });
        const url = init.upload.url ?? init.upload.parts?.[0]?.url;
        if (url) {
          setStatus(`Uploading ${file.name}…`);
          const put = await fetch(url, { method: "PUT", body: file, credentials: "include" });
          const etag = put.headers.get("etag") ?? `"${file.size}"`;
          await api.uploadComplete({ fileId: init.fileId, parts: [{ partNumber: 1, etag }] });
        } else {
          await api.uploadComplete({ fileId: init.fileId, parts: [] });
        }
      }
      setStatus("Upload complete.");
      queryClient.invalidateQueries({ queryKey: ["recent"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: ["folder"] });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-hairline bg-[oklch(0.11_0_0)] p-8" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Upload</p>
        <h2 className="mb-6 text-2xl font-light tracking-tight">Drop files into CloudFS</h2>
        <label 
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setBusy(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setBusy(false); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files) {
              handleFiles(e.dataTransfer.files);
            }
          }}
          className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline bg-surface px-6 text-center hover:bg-surface-2 transition-colors"
        >
          <Upload className="size-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Drag & drop or click to choose</span>
          <input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </label>
        <p className="mt-4 min-h-5 font-mono text-xs text-muted-foreground">{busy ? "Working…" : status}</p>
      </div>
    </div>
  );
}
