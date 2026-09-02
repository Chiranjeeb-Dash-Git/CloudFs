"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Download, FileText, Lock, ShieldCheck, Cloud, Image as ImageIcon, Video, Music, Folder } from "lucide-react";
import { WaveTerrain } from "@/components/WaveTerrain";

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function PublicLinkPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");

  const loadLink = async (pwd?: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const url = pwd 
        ? `/api/link/${token}?password=${encodeURIComponent(pwd)}` 
        : `/api/link/${token}`;
      const res = await fetch(url, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401 || json?.error?.message?.toLowerCase().includes("password")) {
          setRequiresPassword(true);
          setLoading(false);
          return;
        }
        throw new Error(json?.error?.message ?? "Link invalid or expired");
      }
      setRequiresPassword(false);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load link");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLink();
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLink(password);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[oklch(0.05_0_0)] text-white font-mono text-sm tracking-widest animate-pulse">
        RESOLVING PUBLIC LINK...
      </div>
    );
  }

  return (
    <div className="theme-mono relative min-h-screen text-foreground bg-[oklch(0.05_0_0)] selection:bg-primary/20">
      <WaveTerrain />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,oklch(1_0_0/8%)_0%,transparent_55%)]" />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1280px] flex-col px-6 py-8">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-hairline pb-6 mb-8">
          <div className="flex items-center gap-3">
            <Cloud className="size-6 text-primary" />
            <span className="text-lg font-medium tracking-tight">CloudFS Public Share</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-surface px-3 py-1.5 rounded-full border border-hairline">
            <ShieldCheck className="size-3.5 text-green-400" />
            <span>Secure Link</span>
          </div>
        </header>

        {/* Error State */}
        {error && (
          <div className="mx-auto my-auto max-w-md rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center backdrop-blur-xl">
            <p className="mb-2 font-mono text-xs text-red-400 uppercase tracking-widest">Access Error</p>
            <h2 className="mb-4 text-2xl font-light">{error}</h2>
            <p className="text-xs text-muted-foreground">This link may have been revoked or has expired.</p>
          </div>
        )}

        {/* Password Prompt */}
        {requiresPassword && !error && (
          <div className="mx-auto my-auto max-w-md w-full rounded-3xl border border-hairline bg-surface p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="size-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <Lock className="size-6 text-primary" />
              </div>
              <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase mb-1">Protected Share</p>
              <h2 className="text-2xl font-light tracking-tight">Password Required</h2>
              <p className="text-xs text-muted-foreground mt-2">Enter the password provided by the owner to view this document.</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter link password"
                className="w-full rounded-full border border-hairline bg-surface-2 px-5 py-3 text-sm outline-none focus:border-primary transition-colors text-center"
              />
              <button
                type="submit"
                className="sheen relative h-[48px] w-full overflow-hidden rounded-full border border-hairline bg-secondary text-sm font-medium transition-transform active:scale-95"
              >
                Unlock Document
              </button>
            </form>
          </div>
        )}

        {/* Resource View */}
        {data && !requiresPassword && !error && (
          <div className="flex flex-col gap-6">
            
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface p-6 backdrop-blur-xl">
              <div className="flex items-center gap-4 min-w-0">
                <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  {data.resource.mimeType?.startsWith("image/") ? (
                    <ImageIcon className="size-6 text-blue-400" />
                  ) : data.resource.mimeType?.startsWith("video/") ? (
                    <Video className="size-6 text-purple-400" />
                  ) : data.resource.mimeType?.startsWith("audio/") ? (
                    <Music className="size-6 text-yellow-400" />
                  ) : data.resource.mimeType?.includes("pdf") ? (
                    <FileText className="size-6 text-red-400" />
                  ) : (
                    <FileText className="size-6 text-primary" />
                  )}
                </div>
                
                <div className="min-w-0">
                  <h1 className="text-xl font-medium truncate">{data.resource.name}</h1>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {formatBytes(data.resource.sizeBytes)} · Shared by {data.owner?.name || "CloudFS User"}
                  </p>
                </div>
              </div>

              {data.resourceType === "file" && (
                <a
                  href={`/api/files/${data.resource.id}/public-download?token=${token}${password ? `&password=${encodeURIComponent(password)}` : ''}`}
                  download={data.resource.name}
                  className="sheen relative flex h-[48px] shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full border border-hairline bg-secondary px-7 text-sm font-medium transition-transform duration-300 hover:scale-105"
                >
                  <Download className="size-4 relative z-10" />
                  <span className="relative z-10">Download File</span>
                </a>
              )}
            </div>

            {/* Preview Stage */}
            <div className="w-full flex items-center justify-center min-h-[60vh] rounded-3xl border border-hairline bg-black/40 p-4 backdrop-blur-md overflow-hidden">
              
              {/* PDF Preview */}
              {(data.resource.mimeType?.includes("pdf") || data.resource.name?.toLowerCase().endsWith(".pdf")) ? (
                <div className="w-full h-[80vh] rounded-2xl overflow-hidden border border-hairline shadow-2xl bg-[#525659] relative">
                  <iframe
                    src={`/api/files/${data.resource.id}/public-download?token=${token}&inline=true${password ? `&password=${encodeURIComponent(password)}` : ''}#toolbar=1`}
                    className="w-full h-full border-0 block"
                    title={data.resource.name}
                  />
                </div>
              ) : data.resource.mimeType?.startsWith("image/") ? (
                /* Image Preview */
                <img
                  src={`/api/files/${data.resource.id}/public-download?token=${token}&inline=true${password ? `&password=${encodeURIComponent(password)}` : ''}`}
                  alt={data.resource.name}
                  className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
                />
              ) : data.resource.mimeType?.startsWith("video/") ? (
                /* Video Preview */
                <video
                  src={`/api/files/${data.resource.id}/public-download?token=${token}&inline=true${password ? `&password=${encodeURIComponent(password)}` : ''}`}
                  controls
                  autoPlay
                  className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl"
                />
              ) : data.resource.mimeType?.startsWith("audio/") ? (
                /* Audio Preview */
                <div className="flex flex-col items-center justify-center p-12 bg-zinc-950/80 border border-zinc-800 rounded-3xl backdrop-blur-md shadow-2xl w-full max-w-md text-center">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-zinc-800 to-black border-2 border-zinc-700 flex items-center justify-center mb-6 shadow-2xl animate-[spin_10s_linear_infinite]">
                    <Music className="size-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1 truncate w-full">{data.resource.name}</h3>
                  <p className="text-xs text-muted-foreground mb-6 font-mono">{formatBytes(data.resource.sizeBytes)}</p>
                  <audio
                    src={`/api/files/${data.resource.id}/public-download?token=${token}&inline=true${password ? `&password=${encodeURIComponent(password)}` : ''}`}
                    controls
                    autoPlay
                    className="w-full h-10 accent-primary"
                  />
                </div>
              ) : (
                /* Default File Info Stage */
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <FileText className="size-16 mb-4 opacity-40 stroke-1 text-primary" />
                  <h3 className="text-lg font-medium text-white mb-2">{data.resource.name}</h3>
                  <p className="text-xs font-mono text-muted-foreground mb-6">
                    {data.resource.mimeType || "Binary file"} · {formatBytes(data.resource.sizeBytes)}
                  </p>
                  <a
                    href={`/api/files/${data.resource.id}/public-download?token=${token}${password ? `&password=${encodeURIComponent(password)}` : ''}`}
                    download={data.resource.name}
                    className="sheen relative flex h-[48px] items-center justify-center gap-2 overflow-hidden rounded-full border border-hairline bg-secondary px-8 text-sm font-medium transition-transform duration-300 hover:scale-105"
                  >
                    <Download className="size-4 relative z-10" />
                    <span className="relative z-10">Download File</span>
                  </a>
                </div>
              )}

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
