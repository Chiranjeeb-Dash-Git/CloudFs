"use client";

import { Search, Bell, Upload, Cloud } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDriveUi } from "@/components/DriveUi";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/files", label: "Files" },
  { href: "/gallery", label: "Gallery" },
  { href: "/shared", label: "Shared" },
  { href: "/security", label: "Security" },
  { href: "/settings", label: "Settings" },
];

export function Nav({ theme = "mono", showUpload = true }: { theme?: "nexacore" | "mono" | "studio"; showUpload?: boolean }) {
  const pathname = usePathname();
  const ui = useDriveUi();
  const activeIndex = navItems.findIndex((item) => pathname?.startsWith(item.href));

  const themeClasses = {
    nexacore: {
      nav: "bg-surface/80 border-border",
      itemActive: "bg-primary text-primary-foreground",
      itemInactive: "hover:bg-surface-2 hover:text-foreground",
      iconBtn: "border-border bg-secondary text-muted-foreground hover:text-foreground",
      avatar: "bg-muted",
    },
    mono: {
      nav: "bg-surface border-hairline",
      itemActive: "bg-surface-2 text-foreground",
      itemInactive: "hover:bg-surface-2 hover:text-foreground",
      iconBtn: "border-hairline bg-secondary text-muted-foreground hover:text-foreground",
      avatar: "chrome-pill",
    },
    studio: {
      nav: "bg-white/[0.03] border-[#5A4A46]/50 backdrop-blur-xl text-[#c9beb2]",
      itemActive: "text-white",
      itemInactive: "hover:text-white hover:bg-white/5",
      iconBtn: "border-[#5A4A46]/50 bg-white/[0.03] text-[#c9beb2]",
      avatar: "accent-btn",
    },
  };

  const t = themeClasses[theme];

  return (
    <nav className={`mb-16 flex w-full items-center justify-between ${theme === "studio" ? "text-white" : ""}`}>
      <Link href="/" className="flex items-center gap-2.5">
        {theme === "studio" ? (
          <iconify-icon icon="solar:cloud-linear" className="text-2xl text-white/85" />
        ) : (
          <Cloud className="size-5 opacity-85" strokeWidth={1.4} />
        )}
        <span className={`text-base font-medium tracking-tight ${theme === "studio" ? "font-display text-lg" : ""}`}>
          CloudFS
        </span>
      </Link>

      <div className={`hidden items-center gap-1 rounded-full border p-1.5 text-[13px] backdrop-blur-xl md:flex ${t.nav} ${theme === "mono" ? "text-muted-foreground" : ""}`}>
        {navItems.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            className={`rounded-full px-4 py-1.5 transition-all duration-300 ${i === activeIndex ? t.itemActive : t.itemInactive} ${
              theme === "studio" ? "font-mono" : ""
            }`}
            style={theme === "studio" && i === activeIndex ? { background: "var(--primary)" } : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {theme !== "studio" ? (
          <>
            <button
              aria-label="Search"
              onClick={ui.openSearch}
              className={`flex size-10 items-center justify-center rounded-full border transition-colors duration-300 ${t.iconBtn}`}
            >
              <Search className="size-4" strokeWidth={1.5} />
            </button>
            <button
              aria-label="Notifications"
              className={`relative flex size-10 items-center justify-center rounded-full border transition-colors duration-300 ${t.iconBtn}`}
            >
              <Bell className="size-4" strokeWidth={1.5} />
              <span className="pulse-glow absolute top-2 right-2 size-1.5 rounded-full bg-foreground" />
            </button>
          </>
        ) : null}
        {showUpload ? (
          <button
            onClick={ui.openUpload}
            className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-transform duration-500 hover:-translate-y-0.5 ${
              theme === "studio"
                ? "accent-btn text-white"
                : "sheen relative overflow-hidden border border-hairline bg-secondary"
            }`}
          >
            {theme === "studio" ? <iconify-icon icon="solar:upload-linear" /> : <Upload className="relative z-10 size-4" strokeWidth={1.6} />}
            <span className="relative z-10">Upload{theme === "studio" ? "" : " Files"}</span>
          </button>
        ) : null}
        {theme !== "studio" ? (
          <Link
            href="/settings"
            className={`${t.avatar} flex size-10 items-center justify-center rounded-full text-xs font-semibold`}
          >
            AK
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export default Nav;
