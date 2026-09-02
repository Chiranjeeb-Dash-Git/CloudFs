"use client";

import { Search, Filter, ArrowUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [owner, setOwner] = useState("all");
  const [sort, setSort] = useState("name");
  const [order, setOrder] = useState("asc");

  const [results, setResults] = useState<Array<any>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const data = await api.searchAdvanced({ q, type, owner, sort, order });
        setResults(data.results);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search unavailable");
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q, type, owner, sort, order]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-hairline bg-[oklch(0.11_0_0)] shadow-[0_32px_80px_-24px_oklch(0_0_0/95%)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-hairline px-5 py-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline bg-surface/30 px-5 py-3 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Filter className="size-3.5" /> Filters:
          </div>
          
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value)}
            className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs outline-none"
          >
            <option value="all">All Types</option>
            <option value="folder">Folders</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="document">Documents</option>
            <option value="audio">Audio</option>
          </select>

          <select 
            value={owner} 
            onChange={(e) => setOwner(e.target.value)}
            className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs outline-none"
          >
            <option value="all">All Owners</option>
            <option value="me">Owned by me</option>
            <option value="shared">Shared with me</option>
          </select>

          <div className="flex items-center gap-1 text-muted-foreground ml-auto">
            <ArrowUpDown className="size-3.5" /> Sort:
          </div>

          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
            className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs outline-none"
          >
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="created">Created</option>
          </select>

          <button 
            onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
            className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs uppercase"
          >
            {order}
          </button>
        </div>

        <div className="max-h-80 overflow-auto p-2">
          {error ? <p className="px-3 py-4 text-xs text-muted-foreground">{error}</p> : null}
          {!error && results.length === 0 ? (
            <p className="px-3 py-4 font-mono text-xs text-muted-foreground text-center">
              No matching files or folders found.
            </p>
          ) : (
            results.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-2xl px-4 py-3 font-mono text-sm hover:bg-surface-2">
                <span className="truncate">{r.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {"mimeType" in r ? r.mimeType.split("/")[0] : "folder"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
