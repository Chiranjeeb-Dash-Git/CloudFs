import type { Metadata, Viewport } from "next";
import { Inter, Space_Mono, DM_Sans, Fraunces } from "next/font/google";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceMono = Space_Mono({ subsets: ["latin"], variable: "--font-space-mono", weight: ["400", "700"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["200", "300", "400", "500", "600"] });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["300", "400", "500"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "CloudFS — Encrypted Cloud Drive",
  description: "CloudFS is a cinematic cloud drive: 2 TB encrypted storage, real-time team sync, expiring share links and mirrored regions.",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "CloudFS — Encrypted Cloud Drive",
    description: "Encrypted storage, real-time sync across your team, and share links with expiry — in one monochrome control room.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F1115",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceMono.variable} ${dmSans.variable} ${fraunces.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@200;300;400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script
          src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"
          strategy="lazyOnload"
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-primary/40">{children}</body>
    </html>
  );
}