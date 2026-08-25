"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { EmberParticles } from "@/components/EmberParticles";
import { Nav } from "@/components/Nav";

gsap.registerPlugin(ScrollTrigger);

export default function FilesPage() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

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
          <p className="text-sm text-[#c9beb2] leading-relaxed mt-4 font-mono">Digital experiences. Driven by data. Crafted with care.</p>
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
                  25k<span className="text-4xl align-top">+</span>
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
                  <h3 className="font-display italic text-2xl font-normal tracking-tight mt-0.5" style={{ color: "var(--ink)" }}>Design Assets</h3>
                </div>
                <iconify-icon icon="solar:pallete-2-linear" className="text-xl" style={{ color: "var(--primary)" }} />
              </div>
              <span className="relative text-xs font-mono" style={{ color: "var(--ink-soft)" }}>1,204 files · 68 GB</span>
            </div>
          </article>

          {/* Photography Library */}
          <article className="studio-card md:col-span-5" style={{ "--lift-delay": "1.2s" } as React.CSSProperties}>
            <div className="studio-card-inner sheen-studio ambient-loop h-full p-7 flex flex-col justify-between min-h-[165px]" style={{ "--sheen-delay": "2s" } as React.CSSProperties}>
              <div className="art-orb" style={{ width: "150px", height: "150px", bottom: "-40px", left: "-30px", background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)", opacity: 0.28, animationDelay: "-4s" }} />
              <div className="relative flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ink-soft)" }}>N° 03</span>
                  <h3 className="font-display italic text-2xl font-normal tracking-tight mt-0.5" style={{ color: "var(--ink)" }}>Photography Library</h3>
                </div>
                <iconify-icon icon="solar:gallery-wide-linear" className="text-xl" style={{ color: "var(--primary)" }} />
              </div>
              <span className="relative text-xs font-mono" style={{ color: "var(--ink-soft)" }}>6,512 files · 412 GB</span>
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
                <h3 className="font-display italic text-lg font-normal tracking-tight" style={{ color: "var(--ink)" }}>Marketing Videos</h3>
                <span className="text-xs font-mono" style={{ color: "var(--ink-soft)" }}>340 files · 210 GB</span>
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
                <h3 className="font-display italic text-lg font-normal tracking-tight" style={{ color: "var(--ink)" }}>Client Contracts</h3>
                <span className="text-xs font-mono" style={{ color: "var(--ink-soft)" }}>89 files · 1.1 GB</span>
              </div>
            </div>
          </article>

          {/* Audio Masters */}
          <article className="studio-card md:col-span-4" style={{ "--lift-delay": "3s" } as React.CSSProperties}>
            <div className="studio-card-inner sheen-studio ambient-loop h-full p-7 flex flex-col justify-between min-h-[160px]" style={{ "--sheen-delay": "5s" } as React.CSSProperties}>
              <div className="art-orb" style={{ width: "110px", height: "110px", bottom: "-30px", right: "-20px", background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)", opacity: 0.3, animationDelay: "-8s" }} />
              <div className="relative flex items-start justify-between">
                <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ink-soft)" }}>N° 06</span>
                <iconify-icon icon="solar:music-note-3-linear" className="text-xl" style={{ color: "var(--primary)" }} />
              </div>
              <div className="relative">
                <h3 className="font-display italic text-lg font-normal tracking-tight" style={{ color: "var(--ink)" }}>Audio Masters</h3>
                <span className="text-xs font-mono" style={{ color: "var(--ink-soft)" }}>275 files · 34 GB</span>
              </div>
            </div>
          </article>
        </section>

        {/* Editorial statement band */}
        <section className="my-16 flex items-center gap-6">
          <span className="hairline flex-1" />
          <p className="font-display italic text-2xl md:text-3xl text-center text-[#e8ded2] max-w-xl leading-snug px-4">
            "Every file, considered — secured, versioned, and beautifully kept."
          </p>
          <span className="hairline flex-1" />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {/* Brand Guidelines */}
          <article className="studio-card" style={{ "--lift-delay": "3.6s" } as React.CSSProperties}>
            <div className="studio-card-inner sheen-studio ambient-loop h-full p-7 flex items-center justify-between min-h-[120px]" style={{ "--sheen-delay": "0.5s" } as React.CSSProperties}>
              <div className="art-orb" style={{ width: "130px", height: "130px", top: "-30px", left: "40%", background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)", opacity: 0.25 }} />
              <div className="relative">
                <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ink-soft)" }}>N° 07</span>
                <h3 className="font-display italic text-xl font-normal tracking-tight" style={{ color: "var(--ink)" }}>Brand Guidelines</h3>
                <span className="text-xs font-mono" style={{ color: "var(--ink-soft)" }}>12 files · updated 2 days ago</span>
              </div>
              <div className="relative w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--primary)" }}>
                <iconify-icon icon="solar:arrow-right-up-linear" className="text-white text-xl" />
              </div>
            </div>
          </article>

          {/* Recently modified */}
          <article className="studio-card" style={{ "--lift-delay": "4.2s" } as React.CSSProperties}>
            <div className="studio-card-inner sheen-studio ambient-loop h-full p-7 flex items-center justify-between min-h-[120px]" style={{ "--sheen-delay": "1.5s" } as React.CSSProperties}>
              <div className="art-orb" style={{ width: "130px", height: "130px", bottom: "-30px", right: "20%", background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)", opacity: 0.25, animationDelay: "-5s" }} />
              <div className="relative">
                <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ink-soft)" }}>N° 08</span>
                <h3 className="font-display italic text-xl font-normal tracking-tight" style={{ color: "var(--ink)" }}>Recently Modified</h3>
                <span className="text-xs font-mono" style={{ color: "var(--ink-soft)" }}>18 files touched today</span>
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