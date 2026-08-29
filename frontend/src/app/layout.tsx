import type { Metadata, Viewport } from "next";
import { Inter, Space_Mono, DM_Sans, Fraunces } from "next/font/google";
import { Providers } from "@/components/Providers";
import { IconifyLoader } from "@/components/IconifyLoader";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600"], display: "swap" });

const spaceMono = Space_Mono({ subsets: ["latin"], variable: "--font-space-mono", weight: ["400", "700"], display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["400", "500", "600"], display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CloudFS — Encrypted Cloud Drive",
  description:
    "CloudFS is a cinematic cloud drive: 2 TB encrypted storage, real-time team sync, expiring share links and mirrored regions.",
};

export const viewport: Viewport = {
  themeColor: "#0F1115",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceMono.variable} ${dmSans.variable} ${fraunces.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
        <IconifyLoader />
      </body>
    </html>
  );
}

