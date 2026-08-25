"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await api.search(q.trim());
        setResults(data.results.map((r) => ({ id: r.id, name: r.name })));
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search unavailable");
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-hairline bg-[oklch(0.11_0_0)] shadow-[0_32px_80px_-24px_oklch(0_0_0/95%)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-hairline px-5 py-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, type, or owner"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-72 overflow-auto p-2">
          {error ? <p className="px-3 py-4 text-xs text-muted-foreground">{error}</p> : null}
          {!error && results.length === 0 ? (
            <p className="px-3 py-4 font-mono text-xs text-muted-foreground">
              {q ? "No matches." : "Type to search across your drive."}
            </p>
          ) : (
            results.map((r) => (
              <div key={r.id} className="rounded-2xl px-3 py-2.5 font-mono text-sm hover:bg-surface-2">
                {r.name}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
