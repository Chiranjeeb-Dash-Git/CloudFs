# CloudFS — Project Documentation

Cloud-based media file storage & sharing platform. "Google Drive core" — auth, folders, upload/download, search, granular sharing. Clean UI, strong access control, scalable storage.

---

## 1. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + React, Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL via Supabase |
| Storage | Supabase Storage (S3-compatible) |
| Auth | Supabase Auth / JWT (httpOnly cookies) + bcrypt, Google OAuth |
| State/Data | TanStack Query |
| Uploads | Multer (small) / presigned multipart (large) |
| Background jobs | BullMQ + Redis (thumbnails, emails, purge) |
| Icons | Iconify (`solar` icon set) |
| Animation | native CSS + IntersectionObserver (Dashboard), GSAP + ScrollTrigger (Files page) |
| 3D/WebGL | Three.js r128 (ambient background effects only — decorative, non-blocking) |
| Deployment | Frontend → Vercel · Backend → Render/Fly.io · DB/Storage → Supabase |
| Monitoring | Sentry, Logtail/Datadog, uptime checks |

**Non-goals (MVP):** office-style editors, real-time co-editing, complex org hierarchy, desktop sync client.

---

## 2. Design System

Three sections have finalized visual designs, each with a **distinct, intentional theme**. Do not merge these into one palette — build each section true to its own theme, connected only by shared components (buttons, nav shape, icon set) and consistent spacing rhythm.

### 2.1 Landing Page — "NexaCore" theme

| Token | Value |
|---|---|
| Primary / Accent | `#6D5DFB` |
| Secondary | `#18181B` |
| Background | `#0F1115` |
| Surface | `#18181B` |
| Text primary | `#FFFFFF` |
| Text secondary | `#A1A1AA` |
| Border | `#27272A` |
| Font (display + body) | Space Mono |
| Radius | card `8px` · control `8px` · pill `9999px` |
| Spacing | base `8px` · gap `16px` · card padding `24px` · section padding `80px` |

Style: dark, dense, dashboard-like, technical/mono aesthetic. Bento-style cards, chart/metric panels, WebGL/particle atmosphere behind content (kept secondary and performant). Masked reveals, staggered entrance, hover lift. Do not flatten into generic SaaS card grid — preserve first-viewport focal object and density.

### 2.2 Dashboard / Main Page — "CloudFS Mono" theme

| Token | Value |
|---|---|
| Background | `oklch(0.05 0 0)` (near-black) |
| Foreground/text | `oklch(0.985 0 0)` |
| Surface | `oklch(1 0 0 / 4%)` |
| Surface-2 | `oklch(1 0 0 / 7%)` |
| Border/hairline | `oklch(1 0 0 / 12%)` / `oklch(1 0 0 / 10%)` |
| Secondary | `oklch(0.24 0 0)` |
| Accent | `oklch(0.28 0 0)` |
| Muted text | `oklch(0.68 0 0)` |
| Font UI | DM Sans (weights 200–600) |
| Font mono (labels/meta) | Space Mono |
| Radius | panel `2rem` · pill nav/buttons `9999px` |
| Container | max-width `1280px` |

Style: monochrome glass/chrome panels, soft bezel gradients, ambient WebGL wave-terrain background (`#wave-canvas`, low-opacity, mouse-reactive), floating orb sphere inside the storage-usage card. Pill-shaped top nav (Dashboard / Files / Shared / Security / Settings). Bento grid layout, hover-lift on panels, sheen sweep on primary CTA buttons. Reduced-motion fallback required (`prefers-reduced-motion`).

### 2.3 Files Page — "CloudFS Studio" theme

| Token | Value |
|---|---|
| Background | `#0F0A09` |
| Surface (card) | `#E6E1D6` (warm ivory) |
| Card text | `#1c130f` (ink) / `#5a4a40` (ink-soft) |
| Primary | `#4A1711` (deep burgundy) |
| Gold accent | `#B4884C` |
| Border | `#5A4A46` |
| Font display | Fraunces (italic for headings) |
| Font mono (labels/meta) | ui-monospace |
| Radius | card `2rem` |
| Container | max-width `1280px` |

Style: warm editorial / "luxury stationery" aesthetic — ivory cards on near-black background, engraved corner marks, blurred color-orb accents inside cards, ember particle field (Three.js) drifting upward behind content, GSAP scroll-triggered card entrance (`back.out` ease). Nav pill matches Dashboard nav but uses this theme's burgundy active-state. This page intentionally contrasts with the Dashboard's cold monochrome — it's the "library/archive" mood vs. the Dashboard's "control room" mood. Keep this contrast; it's a deliberate section-level shift, not an inconsistency.

**Cross-section shared elements:** pill-shaped nav bar with same 5 links (Dashboard, Files, Shared, Security, Settings), circular icon-buttons for search/notifications, `iconify-icon` (`solar:*` set) throughout, sheen-sweep hover on primary CTAs, hover-lift on cards, IntersectionObserver-based scroll reveal.

---

## 3. Information Architecture

```
/                       Landing (NexaCore theme)
/dashboard              Main dashboard (CloudFS Mono theme)
/files                  File browser (CloudFS Studio theme)
/shared                 Shared with me            [not yet designed → inherit Mono theme]
/security               Sessions & security        [not yet designed → inherit Mono theme]
/settings               Account settings           [not yet designed → inherit Mono theme]
/trash                  Trash / restore            [not yet designed → inherit Mono theme]
```

Nav is persistent across `/dashboard`, `/files`, `/shared`, `/security`, `/settings` (pill nav, active tab highlighted per that page's theme).

---

## 4. Section Specs

### 4.1 Landing Page (`/`)

**Purpose:** product intro / marketing entry point for NexaCore-branded showcase.

- Hero: "Anomaly Resolution" headline, founding label ("FOUNDED 2024"), subline copy.
- Dashboard-style preview panels (bento) showing product capability at a glance — charts, flow diagrams, metric cards.
- WebGL/particle atmosphere layer behind hero, kept secondary to content, must stay performant on lower-end devices (throttle/disable under `prefers-reduced-motion`).
- CTA → routes to signup or `/dashboard`.

### 4.2 Dashboard (`/dashboard`)

**Purpose:** signed-in home. Snapshot of storage, quick actions, recent activity.

Components (top to bottom):
1. **Nav** — pill nav (Dashboard active), search icon-button, notification icon-button (unread pulse dot), avatar chip.
2. **Header** — breadcrumb-style path label (`My Drive / Media / Q3 Campaign`), greeting ("Welcome back, {name}."), storage summary line, primary "Upload Files" CTA (sheen effect).
3. **Bento grid** (3 columns, desktop):
   - Col 1: Quick Actions (New Folder / Share), Storage Usage (radial % + free space, animated orb canvas), Security & Sessions summary.
   - Col 2 (center, tall): Search & Filters promo card with animated icon.
   - Col 3: Collaboration (real-time sync) card, Integrations (Slack/Figma/API keys) card.
4. **Recent files table** — columns: name (mono), type, size, owner, last-modified, hover reveal action icon. Row types: video, design file, document, dataset, folder.
5. **Pillars section** (3-up): Encrypted at rest (AES-256, 30-day key rotation), Mirrored 3 regions, Live presence.
6. **Closing CTA panel** — restates trust stats (capacity / regions / encryption), "Start uploading" button.
7. **Footer** — brand mark, system-status mono line.

Interactions: scroll-reveal on all major blocks (staggered delay), subtle parallax drift on selected cards, hover-lift + shadow bloom on panels, ambient wave-terrain background reacts to scroll + pointer position.

### 4.3 Files Page (`/files`)

**Purpose:** primary file browser / library view.

Components (top to bottom):
1. **Nav** — same pill nav, Files tab active (burgundy fill), Upload button (top-right, gradient burgundy).
2. **Header** — index label ("N° 001 — Your library"), display heading ("Files, held with care."), subline.
3. **Bento grid**:
   - Large feature card (left, spans 2 rows): headline stat/summary panel with layered color-orb art and corner marks.
   - Right column: 3 stacked category cards — Marketing Videos, Client Contracts, Audio Masters — each shows item count + total size, numbered (N° 04–06), relevant icon.
4. **Editorial quote band** — centered italic pull-quote between hairline rules (e.g. "Every file, considered — secured, versioned, and beautifully kept.").
5. **Two-up cards**: Brand Guidelines (file count + last-updated), Recently Modified (files touched today) — each with circular action icon.

Interactions: GSAP `ScrollTrigger` entrance (rotateX + scale-in, staggered per card), ambient card float loop, sheen sweep per card (staggered delay), ember particle field drifting upward in background (Three.js, additive blending), card hover = lift + rotateX tilt + stronger shadow.

### 4.4 Remaining pages (functional spec only — not yet designed)

Build these on the **Dashboard Mono theme** (extend, don't invent a new palette) until dedicated designs are supplied:

- **Shared (`/shared`)** — list of files/folders shared with the user; role badge (Viewer/Editor); filter by shared-by-me vs shared-with-me.
- **Security (`/security`)** — active sessions list (device, location, last active), revoke-session action, password/2FA management, OAuth-connected accounts.
- **Settings (`/settings`)** — profile (name, avatar, email), storage plan, notification preferences.
- **Trash (`/trash`)** — soft-deleted items, days-remaining countdown, restore / permanently-delete actions.

---

## 5. Core Features

### 5.1 MVP
- Email/password + Google OAuth auth, sessions, profile
- Folder CRUD, hierarchical tree, breadcrumbs
- File upload (drag & drop + picker), download, rename, move, delete
- Share to specific users (Viewer / Editor roles), revoke, view access list
- Public share links — expiry, optional password
- Search by name/type/owner; sort and filter
- Recent files, Starred/Favorites
- Trash with 30-day retention + restore

### 5.2 Phase 2+
- Version history (current pointer + archived versions, revert)
- File previews/thumbnails (images, PDF, text)
- Activity/audit log
- Tags/labels, bulk actions, keyboard shortcuts
- Full-text + fuzzy search (`pg_trgm`), shared drives/teams
- Storage quota + usage dashboard

### 5.3 Bonus (stretch)
- Stripe payments for premium storage tiers
- Real-time collaboration via WebSockets
- Native mobile/desktop wrapper (React Native / Electron)

---

## 6. Roles & Permissions

| Role | Capability |
|---|---|
| Owner | full control over own files/folders |
| Editor | upload, edit metadata, move, delete within shared items |
| Viewer | read/download only |
| Public link holder | view-only by default; optional password + expiry |

All permission checks enforced **server-side**, on every operation — never trust client-side role display.

---

## 7. Data Model (PostgreSQL)

```
users            id · email(unique) · name · image_url · created_at

folders          id · name · owner_id → users · parent_id → folders (nullable)
                 is_deleted · created_at · updated_at
                 unique(owner_id, parent_id, name) where not deleted

files            id · name · mime_type · size_bytes · storage_key(unique)
                 owner_id → users · folder_id → folders (nullable)
                 version_id → file_versions (nullable, current pointer)
                 checksum · is_deleted · created_at · updated_at

file_versions    id · file_id → files · version_number · storage_key
                 size_bytes · checksum · created_at

shares           id · resource_type(file|folder) · resource_id
                 grantee_user_id → users · role(viewer|editor)
                 created_by → users · created_at
                 unique(resource_type, resource_id, grantee_user_id)

link_shares      id · resource_type · resource_id · token(unique)
                 role(viewer) · password_hash(nullable) · expires_at(nullable)
                 created_by · created_at

stars            user_id · resource_type · resource_id
                 pk(user_id, resource_type, resource_id)

activities       id · actor_id · action(upload|rename|delete|restore|move|share|download)
                 resource_type · resource_id · context(jsonb) · created_at
```

**Indexes:** `files(name, owner_id)`, `folders(name, owner_id)`, `files` GIN trigram on `name`, `activities(created_at desc)`, `shares(resource_type, resource_id)`, `link_shares(token)`.

**Storage key format:** `tenants/{owner_id}/folders/{folder_id}/files/{file_uuid}-{slug}.{ext}` (versions append `v{n}`).

---

## 8. API Endpoints (REST, JSON — camelCase payloads)

**Auth**
- `POST /api/auth/register` `{ email, password, name }`
- `POST /api/auth/login` `{ email, password }` → sets httpOnly cookies
- `POST /api/auth/logout`
- `GET /api/auth/me`

**Folders**
- `POST /api/folders` `{ name, parentId }`
- `GET /api/folders/:id` → `{ folder, children:{folders[], files[]}, path[] }`
- `PATCH /api/folders/:id` `{ name?, parentId? }`
- `DELETE /api/folders/:id` (soft delete)

**Files**
- `POST /api/files/init` `{ name, mimeType, sizeBytes, folderId }` → upload URLs/parts
- `POST /api/files/complete` `{ fileId, parts:[{partNumber, etag}] }`
- `GET /api/files/:id` → `{ file, signedUrl }`
- `PATCH /api/files/:id` `{ name?, folderId? }`
- `DELETE /api/files/:id` (soft delete)

**Shares**
- `POST /api/shares` `{ resourceType, resourceId, granteeUserId, role }`
- `GET /api/shares/:resourceType/:resourceId`
- `DELETE /api/shares/:id`

**Public links**
- `POST /api/link-shares` `{ resourceType, resourceId, expiresAt?, password? }`
- `GET /api/link/:token`
- `DELETE /api/link-shares/:id`

**Search / Stars / Trash**
- `GET /api/search?q=&type=&owner=&starred=`
- `POST /api/stars` / `DELETE /api/stars` `{ resourceType, resourceId }`
- `GET /api/trash`
- `POST /api/trash/restore` `{ resourceType, resourceId }`

Error shape: `{ error: { code, message } }` with correct HTTP status.

---

## 9. Key Flows

**Upload:** client → `init` (auth+ACL check, DB placeholder row `status:uploading`, returns presigned parts) → client uploads parts directly to storage → client → `complete` (verify etags, flip row to `ready`, enqueue thumbnail job).

**Download:** client requests → API checks ACL → returns short-lived signed URL → client fetches from CDN.

**Share:** owner `POST /shares` → ACL row (user+role) or link token (expiry/password hash).

**Search:** `GET /search` → indexed columns + Postgres trigram/full-text.

---

## 10. Security Checklist

- httpOnly cookies, short-lived access token + refresh rotation
- ACL enforced at API **and** storage layer (Supabase RLS / presigned checks) — never expose raw storage keys
- Signed URLs short TTL; public link tokens long+random; password rate-limited
- Input validation (Zod), filename sanitization, no path traversal
- Rate limits (per IP + per user), stricter on upload-init
- Security headers: CSP, X-Content-Type-Options, Referrer-Policy, strict CORS
- Secrets via environment only, never committed
- Auth events / share creations / admin actions logged (minimal PII)
- Daily automated DB backups, quarterly restore drills

---

## 11. Non-Functional

- CDN-backed downloads, cache headers on signed URLs
- Composite DB indexes, batch queries (avoid N+1), cursor-based pagination
- Background workers for previews/scans/emails (BullMQ + Redis)
- Reduced-motion fallback required on every animated section (WebGL, GSAP, CSS reveals)
- Mobile-responsive across all three themed sections

---

## 12. Build Notes (for implementation)

1. Treat this as **3 themed sections sharing one component layer** — don't unify colors across NexaCore / Mono / Studio; do unify nav structure, icon set, button/pill shapes, and spacing scale.
2. Build in this order: Auth → Folders CRUD → Upload (init/complete) → Dashboard UI → Files UI → Sharing/links → Search/Stars → Trash → Landing page polish.
3. All three provided HTML references are the literal source of truth for markup/animation structure of their sections — reproduce hierarchy, density, and motion timing, don't reinterpret into generic cards.
4. Untitled pages (`Shared`, `Security`, `Settings`, `Trash`) extend the Dashboard Mono theme's tokens and components (same panel, pill nav, hairline borders) until custom designs exist.
5. Keep WebGL/particle layers `pointer-events: none`, low z-index, and gated behind `prefers-reduced-motion`.
