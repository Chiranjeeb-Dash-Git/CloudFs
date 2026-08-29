"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
const EmberParticles = dynamic(() => import("@/components/EmberParticles"), { ssr: false });
import { Nav } from "@/components/Nav";
import { useDriveUi } from "@/components/DriveUi";

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function FilesPage() {
  const router = useRouter();
  const ui = useDriveUi();

  const { data: meData, error: meError, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    retry: false,
  });

  useEffect(() => {
    if (meError) router.push("/login");
  }, [meError, router]);

  const { data: storageData } = useQuery({
    queryKey: ["storage"],
    queryFn: api.storage,
    refetchInterval: 30_000,
  });

  const { data: recentData } = useQuery({
    queryKey: ["recent"],
    queryFn: api.recent,
    refetchInterval: 15_000,
  });

  const { data: searchData } = useQuery({
    queryKey: ["search", ""],
    queryFn: () => api.search(""),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      (gsap.utils.toArray(".studio-card") as Element[]).forEach((card: Element, i: number) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 60, rotateX: -18, scale: 0.92, transformPerspective: 1000 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            scale: 1,
            duration: 0.9,
            ease: "back.out(1.5)",
            delay: (i % 4) * 0.06,
            scrollTrigger: { trigger: card, start: "top 92%", toggleActions: "play none none reverse" },
          }
        );
      });
    });

    return () => ctx.revert();
  }, []);

  // Derive file counts per category from search results
  const allFiles = (searchData?.results ?? []).filter((r: any) => "mimeType" in r);
  const imageFiles = allFiles.filter((f: any) => (f.mimeType || "").startsWith("image/"));
  const videoFiles = allFiles.filter((f: any) => (f.mimeType || "").startsWith("video/"));
  const docFiles = allFiles.filter((f: any) => !((f.mimeType || "").startsWith("image/") || (f.mimeType || "").startsWith("video/")));
  const imageSize = imageFiles.reduce((acc: number, f: any) => acc + (f.sizeBytes || 0), 0);
  const videoSize = videoFiles.reduce((acc: number, f: any) => acc + (f.sizeBytes || 0), 0);
  const docSize = docFiles.reduce((acc: number, f: any) => acc + (f.sizeBytes || 0), 0);

  const recentFiles = recentData?.items ?? [];
  const recentToday = recentFiles.filter((f) => {
    const d = new Date(f.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  if (meLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <div className="font-mono text-sm tracking-widest animate-pulse">LOADING FILES...</div>
      </div>
    );
  }

  return (
    <div className="theme-studio min-h-screen text-white antialiased overflow-x-hidden selection:bg-[#4A1711]/40">
      <EmberParticles />
      <div className="dither" />

      <main className="relative max-w-[1280px] mx-auto px-6 py-10 z-10">
        <Nav theme="studio" showUpload={true} />

        {/* Header */}
        <header className="mb-14 max-w-2xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#c9beb2]">N° 001 — Your library</span>
            <span className="hairline flex-1" />
          </div>
          <h1 className="font-display italic text-5xl md:text-6xl font-light tracking-tight text-white leading-[1.05]">
            Files, held with care.
          </h1>
          <p className="text-sm text-[#c9beb2] leading-relaxed mt-4 font-mono">
            {formatBytes(storageData?.usedBytes ?? 0)} used of {formatBytes(storageData?.quotaBytes ?? 0)} — {storageData?.fileCount ?? 0} files across {storageData?.folderCount ?? 0} folders.
          </p>
        </header>

        {/* Bento grid */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6">
          {/* Feature stat card */}
          <article className="studio-card md:col-span-7 row-span-2" style={{ "--lift-delay": "0s" } as React.CSSProperties}>
            <div className="studio-card-inner sheen-studio ambient-loop h-full p-10 md:p-12 flex flex-col justify-between min-h-[320px]" style={{ "--sheen-delay": "0s" } as React.CSSProperties}>
              <div className="art-orb" style={{ width: "280px", height: "280px", top: "-90px", right: "-70px", background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)", opacity: 0.35 }} />
              <div className="art-orb" style={{ width: "180px", height: "180px", bottom: "-60px", left: "20%", background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)", opacity: 0.28, animationDelay: "-6s" }} />
              <div className="corner-mark tl" />
              <div className="corner-mark br" />

              <div className="relative flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-[0.25em]" style={{ color: "var(--ink-soft)" }}>Library overview</span>
                <iconify-icon icon="solar:chart-square-linear" className="text-2xl" style={{ color: "var(--primary)" }} />
              </div>

              <div className="relative">
                <div className="font-display italic text-7xl md:text-8xl font-normal tracking-tight" style={{ color: "var(--ink)" }}>
                  {allFiles.length}<span className="text-4xl align-top">+</span>
                </div>
                <div className="hairline my-4" style={{ background: "linear-gradient(90deg, var(--border), transparent)" }} />
                <p className="text-sm max-w-sm font-mono" style={{ color: "var(--ink-soft)" }}>
                  Files secured across CloudFS, replicated in real time and indexed for instant search.
                </p>
              </div>
            </div>
          </article>

          {/* Design Assets */}
          <article className="studio-card md:col-span-5" style={{ "--lift-delay": "0.6s" } as React.CSSProperties}>
            <div className="studio-card-inner sheen-studio ambient-loop h-full p-7 flex flex-col justify-between min-h-[145px]" style={{ "--sheen-delay": "1s" } as React.CSSProperties}>
              <div className="art-orb" style={{ width: "120px", height: "120px", top: "-30px", right: "-30px", background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)", opacity: 0.3 }} />
              <div className="relative flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ink-soft)" }}>N° 02</span>
                  <h3 className="font-display italic text-2xl font-normal tracking-tight mt-0.5" style={{ color: "var(--ink)" }}>Images</h3>
                </div>
                <iconify-icon icon="solar:pallete-2-linear" className="text-xl" style={{ color: "var(--primary)" }} />
              </div>
              <span className="relative text-xs font-mono" style={{ color: "var(--ink-soft)" }}>{imageFiles.length} files · {formatBytes(imageSize)}</span>
            </div>
          </article>

          {/* Photography Library */}
          <article className="studio-card md:col-span-5" style={{ "--lift-delay": "1.2s" } as React.CSSProperties}>
            <div className="studio-card-inner sheen-studio ambient-loop h-full p-7 flex flex-col justify-between min-h-[165px]" style={{ "--sheen-delay": "2s" } as React.CSSProperties}>
              <div className="art-orb" style={{ width: "150px", height: "150px", bottom: "-40px", left: "-30px", background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)", opacity: 0.28, animationDelay: "-4s" }} />
              <div className="relative flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ink-soft)" }}>N° 03</span>
                  <h3 className="font-display italic text-2xl font-normal tracking-tight mt-0.5" style={{ color: "var(--ink)" }}>Videos</h3>
                </div>
                <iconify-icon icon="solar:gallery-wide-linear" className="text-xl" style={{ color: "var(--primary)" }} />
              </div>
              <span className="relative text-xs font-mono" style={{ color: "var(--ink-soft)" }}>{videoFiles.length} files · {formatBytes(videoSize)}</span>
            </div>
          </article>

          {/* Marketing Videos */}
          <article className="studio-card md:col-span-4" style={{ "--lift-delay": "1.8s" } as React.CSSProperties}>
            <div className="studio-card-inner sheen-studio ambient-loop h-full p-7 flex flex-col justify-between min-h-[160px]" style={{ "--sheen-delay": "3s" } as React.CSSProperties}>
              <div className="art-orb" style={{ width: "100px", height: "100px", top: "-25px", left: "-25px", background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)", opacity: 0.3 }} />
              <div className="relative flex items-start justify-between">
                <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ink-soft)" }}>N° 04</span>
                <iconify-icon icon="solar:videocamera-record-linear" className="text-xl" style={{ color: "var(--primary)" }} />
              </div>
              <div className="relative">
                <h3 className="font-display italic text-lg font-normal tracking-tight" style={{ color: "var(--ink)" }}>Documents</h3>
                <span className="text-xs font-mono" style={{ color: "var(--ink-soft)" }}>{docFiles.length} files · {formatBytes(docSize)}</span>
              </div>
            </div>
          </article>

          {/* Client Contracts */}
          <article className="studio-card md:col-span-4" style={{ "--lift-delay": "2.4s" } as React.CSSProperties}>
            <div className="studio-card-inner sheen-studio ambient-loop h-full p-7 flex flex-col justify-between min-h-[160px]" style={{ "--sheen-delay": "4s" } as React.CSSProperties}>
              <div className="art-orb" style={{ width: "100px", height: "100px", top: "-25px", right: "-25px", background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)", opacity: 0.3, animationDelay: "-3s" }} />
              <div className="relative flex items-start justify-between">
                <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ink-soft)" }}>N° 05</span>
                <iconify-icon icon="solar:document-text-linear" className="text-xl" style={{ color: "var(--primary)" }} />
              </div>
              <div className="relative">
                <h3 className="font-display italic text-lg font-normal tracking-tight" style={{ color: "var(--ink)" }}>Shared Files</h3>
                <span className="text-xs font-mono" style={{ color: "var(--ink-soft)" }}>{storageData?.sharedCount ?? 0} shared</span>
              </div>
            </div>
          </article>

          {/* Storage overview */}
          <article className="studio-card md:col-span-4" style={{ "--lift-delay": "3s" } as React.CSSProperties}>
            <div className="studio-card-inner sheen-studio ambient-loop h-full p-7 flex flex-col justify-between min-h-[160px]" style={{ "--sheen-delay": "5s" } as React.CSSProperties}>
              <div className="art-orb" style={{ width: "110px", height: "110px", bottom: "-30px", right: "-20px", background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)", opacity: 0.3, animationDelay: "-8s" }} />
              <div className="relative flex items-start justify-between">
                <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ink-soft)" }}>N° 06</span>
                <iconify-icon icon="solar:music-note-3-linear" className="text-xl" style={{ color: "var(--primary)" }} />
              </div>
              <div className="relative">
                <h3 className="font-display italic text-lg font-normal tracking-tight" style={{ color: "var(--ink)" }}>Storage</h3>
                <span className="text-xs font-mono" style={{ color: "var(--ink-soft)" }}>{formatBytes(storageData?.usedBytes ?? 0)} of {formatBytes(storageData?.quotaBytes ?? 0)}</span>
              </div>
            </div>
          </article>
        </section>

        {/* Editorial statement band */}
        <section className="my-16 flex items-center gap-6">
          <span className="hairline flex-1" />
          <p className="font-display italic text-2xl md:text-3xl text-center text-[#e8ded2] max-w-xl leading-snug px-4">
            &quot;Every file, considered — secured, versioned, and beautifully kept.&quot;
          </p>
          <span className="hairline flex-1" />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {/* Upload card */}
          <article className="studio-card" style={{ "--lift-delay": "3.6s" } as React.CSSProperties}>
            <button onClick={ui.openUpload} className="studio-card-inner sheen-studio ambient-loop h-full p-7 flex items-center justify-between min-h-[120px] w-full text-left" style={{ "--sheen-delay": "0.5s" } as React.CSSProperties}>
              <div className="art-orb" style={{ width: "130px", height: "130px", top: "-30px", left: "40%", background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)", opacity: 0.25 }} />
              <div className="relative">
                <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ink-soft)" }}>N° 07</span>
                <h3 className="font-display italic text-xl font-normal tracking-tight" style={{ color: "var(--ink)" }}>Upload Files</h3>
                <span className="text-xs font-mono" style={{ color: "var(--ink-soft)" }}>Drop files into CloudFS</span>
              </div>
              <div className="relative w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--primary)" }}>
                <iconify-icon icon="solar:arrow-right-up-linear" className="text-white text-xl" />
              </div>
            </button>
          </article>

          {/* Recently modified */}
          <article className="studio-card" style={{ "--lift-delay": "4.2s" } as React.CSSProperties}>
            <div className="studio-card-inner sheen-studio ambient-loop h-full p-7 flex items-center justify-between min-h-[120px]" style={{ "--sheen-delay": "1.5s" } as React.CSSProperties}>
              <div className="art-orb" style={{ width: "130px", height: "130px", bottom: "-30px", right: "20%", background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)", opacity: 0.25, animationDelay: "-5s" }} />
              <div className="relative">
                <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ink-soft)" }}>N° 08</span>
                <h3 className="font-display italic text-xl font-normal tracking-tight" style={{ color: "var(--ink)" }}>Recently Modified</h3>
                <span className="text-xs font-mono" style={{ color: "var(--ink-soft)" }}>{recentToday.length} files touched today</span>
              </div>
              <div className="relative w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--primary)" }}>
                <iconify-icon icon="solar:clock-circle-linear" className="text-white text-xl" />
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}