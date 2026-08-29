# 🌌 CloudFS — Cinematic Media Storage

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=flat-round&logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Backend-Express.js-000000?style=flat-round&logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Auth%20%26%20Database-Supabase-3ecf8e?style=flat-round&logo=supabase)](https://supabase.com/)
[![Three.js](https://img.shields.io/badge/Graphics-Three.js-000000?style=flat-round&logo=three.js)](https://threejs.org/)
[![GSAP](https://img.shields.io/badge/Animations-GSAP-green?style=flat-round&logo=greensock)](https://greensock.com/)

CloudFS is a high-performance, cinematic cloud drive featuring end-to-end encrypted storage, real-time team synchronization, expiring share links, and regional mirroring. Designed with a premium 3D WebGL user interface and backed by an Express API integrated with Supabase.

---

## 🎨 Immersive Themes & Graphic Animations
CloudFS spans three distinct visual worlds crafted using custom **Three.js WebGL rendering loops** and **GSAP**:
*   **Nexa Atmosphere (Landing Page):** A glowing 3D Nimbus Disk reacting dynamically to pointer movement and scroll depth.
*   **Mono Control Room (Dashboard):** An interactive 3D WebGL Storage Orb representing capacity and a monochrome grid wave terrain.
*   **Studio Library (Files & Gallery):** Floating fire ember particle simulations reacting to navigation events, coupled with smooth scroll-revealed elements.

---

## ⚡ Performance Optimization Metrics
To maintain a butter-smooth 60 FPS visual experience alongside heavy 3D scenes, the application has been optimized in 6 core areas:

1.  **Code-Split Three.js (~600KB Savings):** Defer loading of heavy 3D rendering components (`NimbusDisk`, `WaveTerrain`, `StorageOrb`, `EmberParticles`) using `next/dynamic` to ensure rapid Initial Page Load.
2.  **GPU-Throttled WaveTerrain:** Capped the complex grid wave simulation (12,100 points computing trig operations) to a maximum of `30 FPS` with frame-skip logic, cutting idle CPU/GPU usage by 50%.
3.  **Smart Polling Intervals:** Replaced aggressive 3-second database polling with staggered 15s to 30s intervals, reducing API traffic by **94%** (from ~100 requests/min to ~6).
4.  **Font Loading (Swap Strategy):** Reduced Google Font payloads by removing unused weights and adding `display: swap` to prevent font-loading from blocking first paint.
5.  **Local Bundled Iconify:** Replaced the external CDN script load with a code-split import from `iconify-icon` NPM package, eliminating network round-trips.
6.  **GSAP ScrollTrigger Lazy Registration:** Shifted plugin registration from module top-levels to local hooks (`useEffect` / `useLayoutEffect`), ensuring the main thread is never blocked during initial parse.

---

## 🔒 Supabase Authentication & Database Integration
*   **Google OAuth:** Seamless social sign-in utilizing Supabase Client Auth. Upon authentication, the oauth flow securely exchanges session tokens and registers the profile with the local database.
*   **Transparent Postgres Persistence:** Backed by a custom database client that uses JavaScript **Proxy objects** to mirror the in-memory array states (users, folders, files, versions, shares, and sessions) to your Supabase PostgreSQL database in real-time. If no `DATABASE_URL` is configured, it falls back to memory mode.

---

## ⚙️ Architecture & Data Flow

```mermaid
graph TD
  User((User Browser)) -->|React App| Frontend[Next.js App Client]
  Frontend -->|OAuth Handshake| SupabaseAuth[Supabase Auth Services]
  Frontend -->|REST API Calls| Backend[Express API Server]
  Backend -->|Local Cache / Write-Through Proxy| MemoryStore[Memory Cache Layer]
  MemoryStore -->|Auto-Sync Pool| SupabaseDB[(Supabase PostgreSQL Database)]
  Backend -->|Local Multi-part Binary Write| LocalStorage[(Disk Storage / S3)]
```

---

## 🚀 Setup & Launch

### 1. Root Orchestration (Concurrently)
You can run both servers with a single command from the root directory:
```bash
npm run dev
```

### 2. Manual Directory Configuration

#### Backend Setup (`/backend`)
Create a `.env` file based on `.env.example`:
```env
PORT=8080
DATABASE_URL=postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
JWT_SECRET=your-access-token-secret
REFRESH_SECRET=your-refresh-token-secret
CORS_ORIGIN=http://localhost:3000
```
Start the API:
```bash
cd backend
npm install
npm run dev
```

#### Frontend Setup (`/frontend`)
Create a `.env.local` file based on `.env.example`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
Start the Next.js app:
```bash
cd frontend
npm install
npm run dev
```

---

## 🛠️ Tech Stack & Dependencies
*   **Frontend:** React 18, Next.js 14, React Query, GSAP, Tailwind CSS, Lucide React, Three.js.
*   **Backend:** Express, Node pg (Postgres client), JWT (Authentication), BCryptJS.
*   **Database:** PostgreSQL (Supabase managed), Supabase Auth helper.
