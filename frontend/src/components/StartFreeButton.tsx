"use client";

import Link from "next/link";

const letters = [
  { ch: "S", delay: "0.1s" },
  { ch: "t", delay: "0.205s" },
  { ch: "a", delay: "0.31s" },
  { ch: "r", delay: "0.415s" },
  { ch: "t", delay: "0.521s" },
  { ch: " ", delay: "" },
  { ch: "f", delay: "0.626s" },
  { ch: "r", delay: "0.731s" },
  { ch: "e", delay: "0.837s" },
  { ch: "e", delay: "0.942s" },
];

export function StartFreeButton() {
  return (
    <Link
      href="/register"
      className="nimbus-cta group relative inline-flex h-[60px] items-center gap-x-2 overflow-hidden rounded-full px-5 py-3 text-sm font-medium text-white"
    >
      <div className="nimbus-loader">
        <div className="nimbus-loader-glow" />
      </div>
      <span className="relative z-[2] flex gap-[0.5rem] font-semibold select-none">
        {letters.map((l, i) =>
          l.ch === " " ? (
            <span key={i} className="inline-block w-[0.3rem]" />
          ) : (
            <span key={i} className="nimbus-loader-letter inline-block" style={{ animationDelay: l.delay }}>
              {l.ch}
            </span>
          ),
        )}
      </span>
    </Link>
  );
}
