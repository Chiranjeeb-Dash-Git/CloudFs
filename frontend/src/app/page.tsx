"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
const NimbusDisk = dynamic(() => import("@/components/NimbusDisk"), { ssr: false });
import { RevealText } from "@/components/RevealText";
import { StartFreeButton } from "@/components/StartFreeButton";
import { PenWritingText } from "@/components/PenWritingText";

export default function LandingPage() {
  const [menu, setMenu] = useState(false);

  return (
    <div className="theme-nimbus relative min-h-screen overflow-x-hidden bg-[#050507] font-[family-name:var(--font-inter)] text-[#f4f4f5] antialiased selection:bg-white/20 [isolation:isolate]">
      <div className="fixed inset-0 -z-30 bg-black">
        <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_0%,#050507_100%)] opacity-90" />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#050507]/20 via-transparent to-[#050507] opacity-90" />
      </div>

      <NimbusDisk />

      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.02]"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, #ffffff 0, #ffffff 1px, transparent 1px, transparent 12px)",
        }}
      />

      <div className="pointer-events-none fixed inset-3 z-50 border border-white/5 md:inset-6">
        <div className="absolute -top-[1px] -left-[1px] h-4 w-4 border-t border-l border-white/30" />
        <div className="absolute -top-[1px] -right-[1px] h-4 w-4 border-t border-r border-white/30" />
        <div className="absolute -bottom-[1px] -left-[1px] h-4 w-4 border-b border-l border-white/30" />
        <div className="absolute -bottom-[1px] -right-[1px] h-4 w-4 border-b border-r border-white/30" />
        <div className="absolute top-1/2 left-0 h-[1px] w-2 bg-white/10" />
        <div className="absolute top-1/2 right-0 h-[1px] w-2 bg-white/10" />
        <div className="absolute bottom-0 left-1/2 h-2 w-[1px] bg-white/10" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1920px] flex-col justify-between px-6 py-10 md:px-16 md:py-16">
        <nav className="z-20 flex w-full items-center justify-between">
          <Link href="/" className="group flex cursor-pointer items-center gap-2.5 text-white">
            {/* @ts-ignore */}
            <iconify-icon icon="solar:cloud-linear" className="text-xl text-white/80 transition-colors group-hover:text-white md:text-2xl" />
            <span className="text-sm font-medium tracking-wide md:text-base">CloudFS</span>
          </Link>

          <div className="hidden md:block">
            <Link
              href="/login"
              className="group relative flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-xl transition-all hover:text-white"
            >
              Access Console
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
              {/* @ts-ignore */}
              <iconify-icon icon="solar:arrow-right-linear" className="text-base -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
            </Link>
          </div>

          <button className="cursor-pointer text-white/80 md:hidden" aria-label="Menu" onClick={() => setMenu((v) => !v)}>
            {/* @ts-ignore */}
            <iconify-icon icon="solar:hamburger-menu-linear" className="text-2xl" />
          </button>
        </nav>

        {menu ? (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70 md:hidden">
            <Link href="/login">Access Console</Link>
          </div>
        ) : null}

        <div id="platform" className="mt-32 w-full pb-8 md:mt-0 md:pb-12">
          <div className="flex max-w-2xl flex-col gap-6 md:gap-8">
            <RevealText
              text="Orchestrate every media file into a single point of truth."
              className="text-4xl leading-[1.05] font-light tracking-tighter text-white md:text-5xl lg:text-6xl"
            />
            <PenWritingText
              text="CloudFS ingests media streams across your entire ecosystem, replicating and indexing every asset so nothing is ever lost to the noise."
              className="max-w-md text-sm leading-relaxed font-medium text-white/60 md:text-base"
            />
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <StartFreeButton />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
