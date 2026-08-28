# CloudFs — Backend Build Specification

**Purpose of this document:** This is a complete, standalone backend brief for the CloudFs cloud storage service. It is written so an engineer or AI coding agent (e.g. Antigravity) can implement the entire backend without needing further clarification. Frontend is out of scope — it is being built separately and lives in a different repository.

**Sources reconciled:** This spec is built from the original project PDF plus the project's finalized `documentation.md` (which also defines the frontend design system and page-by-page functional specs). Where the two differed, `documentation.md` wins as the later, refined source. Two backend modules below (Sessions/Security, Settings/Profile) exist only because the frontend docs specify a `/security` and `/settings` page that need them — the original PDF didn't cover these.

**Assumption made (flag if wrong):** The source spec offered three backend language options (Python, Node.js, Java). This document standardizes on the **Node.js + Express + TypeScript** stack, since it is the most fully detailed option in the source material and matches the recommended day-by-day build order. If Python (FastAPI) or Java (Spring Boot) is actually preferred, the schema, API contract, and feature list below stay identical — only the implementation language/framework changes.

**Frontend pages this API must support** (from `documentation.md` Section 3): `/` (landing, no auth calls needed), `/dashboard`, `/files`, `/shared`, `/security`, `/settings`, `/trash`. Every endpoint below is named to match what a client built against this contract would expect — do not rename fields or routes without checking the frontend repo first.

---

## 1. Project Summary

A cloud file storage and sharing backend — "Google Drive core." Provides auth, hierarchical folders, file upload/download via presigned/multipart uploads, granular sharing (per-user + public links), search, starring, and soft-delete trash with restore.

**Non-goals for MVP:** office document co-editing, real-time collaboration, complex org/team hierarchy, desktop sync client.

**Repo:** standalone backend repo, separate from the frontend repo. The frontend calls this API over HTTPS/JSON only — no shared code assumed.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js (LTS) + TypeScript |
| Framework | Express.js (REST) |
| Database | PostgreSQL, managed via Supabase |
| Object storage | Supabase Storage (RLS-protected buckets) — S3 is a drop-in alternative, contract below is storage-provider agnostic |
| Auth | Supabase Auth or Clerk/NextAuth-issued JWTs — httpOnly cookies, short-lived access token + refresh rotation |
| Validation | Zod on every input |
| Background jobs | BullMQ + Redis (thumbnails, email invites, trash purge cron) |
| Testing | Jest + Supertest |
| CI/CD | GitHub Actions → lint, test, build, migrate on deploy |
| Hosting | Render / Fly.io / Heroku (API), Supabase (DB + Storage) |
| Monitoring | Sentry (errors), Logtail/Datadog (logs), uptime checks |

---

## 3. Repo Structure

```
backend/
├── src/
│   ├── config/            # env loading, constants, Supabase/S3 client init
│   ├── middleware/         # auth guard, error handler, rate limiter, validation wrapper
│   ├── modules/
│   │   ├── auth/           # register, login, logout, refresh, me
│   │   ├── folders/        # CRUD, tree/breadcrumbs
│   │   ├── files/          # upload init/complete, get, rename, move, delete
│   │   ├── shares/          # per-user ACL
│   │   ├── linkShares/     # public link tokens
│   │   ├── search/
│   │   ├── stars/
│   │   ├── trash/
│   │   ├── sessions/        # list/revoke sessions, 2FA enable/confirm/disable
│   │   ├── oauthConnections/
│   │   ├── users/           # profile + notification preferences
│   │   └── activities/     # phase 2
│   │   Each module folder contains: routes.ts, controller.ts, service.ts, schema.ts (Zod), repository.ts (DB queries)
│   ├── jobs/                # BullMQ workers: thumbnails, email invites, trash-purge cron
│   ├── db/
│   │   ├── migrations/
│   │   └── client.ts
│   ├── utils/               # signed URL helpers, checksum, slugify, pagination cursor helpers
│   ├── app.ts                # express app assembly, middleware wiring
│   └── server.ts             # entrypoint
├── tests/
│   ├── unit/
│   └── integration/
├── .env.example
├── .github/workflows/ci.yml
├── package.json
└── tsconfig.json
```

Route → Controller → Service → Repository is the required layering for every module: controllers only parse/validate + call services; services hold business logic and ACL checks; repositories are the only place raw SQL/Supabase client calls happen.

---

## 4. Environment Variables (`.env.example`)

```
PORT=8080
NODE_ENV=development
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/drive
JWT_SECRET=super-long-random
REFRESH_SECRET=another-long-random
CORS_ORIGIN=https://your-frontend-domain.com

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=drive

# Redis (background jobs)
REDIS_URL=

# If S3 used instead of Supabase Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
S3_BUCKET=drive-bucket
```

Secrets are never committed; loaded via the hosting platform's environment config.

---

## 5. Database Schema (PostgreSQL)

Run as migrations, in this order (later tables reference earlier ones).

```sql
create extension if not exists pg_trgm;

create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  image_url text,
  notification_preferences jsonb default '{}'::jsonb,
  totp_secret text, -- set once 2FA is enabled, null otherwise
  totp_enabled boolean default false,
  created_at timestamptz default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  refresh_token_hash text not null,
  device text,           -- parsed User-Agent, e.g. "Chrome on macOS"
  ip_address text,
  location text,          -- best-effort geo lookup from ip_address, nullable
  last_active_at timestamptz default now(),
  created_at timestamptz default now(),
  revoked_at timestamptz  -- null while active
);
create index on sessions(user_id) where revoked_at is null;

create table oauth_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  provider text not null check (provider in ('google','github')),
  provider_account_id text not null,
  created_at timestamptz default now(),
  unique(provider, provider_account_id)
);

create table folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references users(id) on delete cascade,
  parent_id uuid references folders(id) on delete set null,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index on folders(owner_id, parent_id, name) where is_deleted = false;

create table files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mime_type text,
  size_bytes bigint,
  storage_key text unique not null,
  owner_id uuid references users(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  version_id uuid, -- set after first version row is created
  checksum text,
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on files(owner_id);
create index on files using gin (name gin_trgm_ops);

create table file_versions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references files(id) on delete cascade,
  version_number int not null,
  storage_key text not null,
  size_bytes bigint,
  checksum text,
  created_at timestamptz default now()
);

create table shares (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  grantee_user_id uuid references users(id) on delete cascade,
  role text not null check (role in ('viewer','editor')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  unique(resource_type, resource_id, grantee_user_id)
);

create table link_shares (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  token text not null unique,
  role text not null default 'viewer' check (role = 'viewer'),
  password_hash text,
  expires_at timestamptz,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

create table stars (
  user_id uuid references users(id) on delete cascade,
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  primary key (user_id, resource_type, resource_id)
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  action text not null check (action in ('upload','rename','delete','restore','move','share','download')),
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  context jsonb,
  created_at timestamptz default now()
);
create index on activities(created_at desc);
create index on shares(resource_type, resource_id);
create index on link_shares(token);
```

**Hierarchy rule:** folders use adjacency list via `parent_id`. Breadcrumbs are computed via a recursive CTE (or a cached path string, engineer's choice). Add an application-level cycle check on move — a folder can never become a descendant of itself.

**Uniqueness rule:** `(owner_id, parent_id, name)` must be unique among non-deleted folders — enforce both in DB (done above) and return a friendly `409 CONFLICT` from the API rather than a raw constraint error.

---

## 6. Roles & Permission Model

| Role | Applies to | Can do |
|---|---|---|
| Owner | files/folders they created | Full control |
| Editor | items shared to them | Upload, edit metadata, move, delete within shared item |
| Viewer | items shared to them | Read/download only |
| Public link holder | items with an active link | Constrained by link settings — view-only by default, optional password + expiry |

**Rule that must never be skipped:** every permission check runs server-side, on every single operation — never trust a client-supplied role. Enforce at both the API layer (service-level check before any repository call) and the storage layer (Supabase RLS policy or S3 presigned-URL scoping). Raw storage keys are never returned to the client — only short-lived signed URLs.

---

## 7. Core Flows

### 7.1 Upload (presigned/multipart)
1. Client → `POST /api/files/init` with `{ name, mimeType, sizeBytes, folderId }`.
2. API checks auth + folder ACL → validates mime type against allowlist (images/pdf/txt/docx/xlsx) and size against plan limit → creates a `files` row with `status: uploading` → returns `{ fileId, storageKey, upload: { method: 'multipart', parts: [{ partNumber, url }] } }`.
3. Client uploads parts directly to storage, tracking progress client-side (no file bytes pass through this API).
4. Client → `POST /api/files/complete` with `{ fileId, parts: [{ partNumber, etag }] }`.
5. API verifies parts/etags against the storage provider → finalizes the `files` row (`status: ready`) → creates the first `file_versions` row → enqueues a thumbnail job.

### 7.2 Download
Client → `GET /api/files/:id` → API checks ACL → returns a short-lived signed URL → client downloads directly from CDN/storage.

### 7.3 Share
Owner → `POST /api/shares` → creates a `shares` row (user + role) or, for public links, `POST /api/link-shares` creates a `link_shares` row with a long random `token`, optional `password_hash`, optional `expires_at`.

### 7.4 Search
`GET /api/search?q=&type=&owner=` → MVP uses indexed `name`/`owner_id`/`mime_type` columns; enhanced version adds Postgres `tsvector`/`pg_trgm` for fuzzy matching (already indexed in the schema above).

### 7.5 Trash
Delete = soft delete (`is_deleted = true`), never a hard delete from the API. A scheduled cron job (BullMQ) purges anything older than the retention window (default 30 days) with a real `DELETE` + storage object removal.

---

## 8. API Contract (REST, JSON)

Conventions: DB is `snake_case`, JSON responses are `camelCase`. Timestamps are ISO 8601. List endpoints paginate via `limit` + `cursor`. Every error responds as:

```json
{ "error": { "code": "FORBIDDEN", "message": "..." } }
```
with the matching HTTP status code (400/401/403/404/409/429/500).

### Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | `{ email, password, name }` | |
| POST | `/api/auth/login` | `{ email, password }` | Sets httpOnly cookie tokens; creates a row in `sessions` (device parsed from User-Agent, `ip_address` from the request) so it shows up on `/security` |
| POST | `/api/auth/logout` | — | Marks the current session `revoked_at = now()` |
| GET | `/api/auth/me` | — | Returns current session user |

### Folders
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/folders` | `{ name, parentId \| null }` | |
| GET | `/api/folders/:id` | — | Returns `{ folder, children: { folders[], files[] }, path[] }` |
| PATCH | `/api/folders/:id` | `{ name?, parentId? }` | |
| DELETE | `/api/folders/:id` | — | Soft delete |

### Files
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/files/init` | `{ name, mimeType, sizeBytes, folderId \| null }` | Returns `{ fileId, upload, storageKey }` |
| POST | `/api/files/complete` | `{ fileId, parts: [{ partNumber, etag }] }` | Finalizes upload, queues thumbnail job |
| GET | `/api/files/:id` | — | Returns `{ file, signedUrl }` |
| PATCH | `/api/files/:id` | `{ name?, folderId? }` | |
| DELETE | `/api/files/:id` | — | Soft delete |

### Shares
| Method | Path | Body |
|---|---|---|
| POST | `/api/shares` | `{ resourceType, resourceId, granteeUserId, role }` |
| GET | `/api/shares/:resourceType/:resourceId` | — |
| DELETE | `/api/shares/:id` | — |

### Public links
| Method | Path | Body |
|---|---|---|
| POST | `/api/link-shares` | `{ resourceType, resourceId, expiresAt?, password? }` |
| GET | `/api/link/:token` | resolves with optional `?password=` |
| DELETE | `/api/link-shares/:id` | — |

### Search / Stars / Trash
| Method | Path | Notes |
|---|---|---|
| GET | `/api/search?q=&type=&owner=&starred=` | |
| POST | `/api/stars` | `{ resourceType, resourceId }` |
| DELETE | `/api/stars` | `{ resourceType, resourceId }` |
| GET | `/api/trash` | list soft-deleted items |
| POST | `/api/trash/restore` | `{ resourceType, resourceId }` |

### Sessions & Security (supports the `/security` page)
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/sessions` | — | List the current user's active sessions: device, location, `lastActiveAt`, flag on the current one |
| DELETE | `/api/sessions/:id` | — | Revoke one session (sets `revoked_at`, invalidates that refresh token) |
| DELETE | `/api/sessions` | — | Revoke all sessions except the current one ("sign out everywhere else") |
| POST | `/api/auth/2fa/enable` | — | Generates a TOTP secret + QR payload, `totp_enabled` stays false until confirmed |
| POST | `/api/auth/2fa/confirm` | `{ code }` | Verifies the first code, flips `totp_enabled` to true |
| POST | `/api/auth/2fa/disable` | `{ code }` | Requires a valid current code to turn off |
| GET | `/api/oauth/connections` | — | List connected providers (Google/GitHub) |
| DELETE | `/api/oauth/connections/:id` | — | Disconnect a provider (block if it's the user's only login method and no password is set) |

### Settings (supports the `/settings` page)
| Method | Path | Body | Notes |
|---|---|---|---|
| PATCH | `/api/users/me` | `{ name?, imageUrl? }` | Profile edits |
| GET | `/api/users/me/notifications` | — | Returns `notification_preferences` |
| PATCH | `/api/users/me/notifications` | `{ ...preferences }` | Partial update, merged into the jsonb column |
| GET | `/api/users/me/plan` | — | Returns storage plan + usage — **Phase 2**, stub with a flat free-tier response until quotas are built |

---

## 9. Security Checklist (non-negotiable for launch)

- httpOnly cookies; short-lived access token + refresh rotation. OAuth (Google/GitHub) optional add-on.
- ACL enforced at both API and storage layer — never trust client role claims.
- All signed URLs are short-TTL. Public link tokens are long and random; passwords (if set) are hashed and rate-limited on attempt.
- Every input validated with Zod. Filenames sanitized — reject any path traversal (`../`, absolute paths, null bytes).
- Rate limiting: general 100 req / 5 min per IP+user; upload-init gets a stricter limit.
- Security headers: CSP, `X-Content-Type-Options`, `Referrer-Policy`, CORS locked to the configured frontend origin only, `Content-Disposition` set correctly on downloads.
- No secrets in the repo — environment-injected only.
- Auth events, share creations, and admin actions are logged; keep PII in logs minimal.
- Daily automated DB backups; storage lifecycle policy for cold data.

---

## 10. Background Jobs (BullMQ + Redis)

| Job | Trigger | Action |
|---|---|---|
| Thumbnail generation | file upload completed | Generate preview via ImageMagick/PDFium, store under `previews/` prefix |
| Email invites | share created for a user without an account, or by request | Send invite email |
| Trash purge | daily cron | Hard-delete rows + storage objects past the retention window |

---

## 11. Storage Key Format

```
tenants/{owner_id}/folders/{folder_id}/files/{file_uuid}-{slug}.{ext}
```
Versions append `v{n}`. Multipart uploads use 5MB+ parts; track `upload_id`, `part_numbers`, and `etag` per part until `complete` finalizes them.

---

## 12. Feature Checklist (build in this order)

**MVP — must ship:**
- [ ] Email/password + optional OAuth auth, sessions, `/me` profile
- [ ] Folder CRUD, hierarchy, breadcrumbs
- [ ] File upload (multipart/presigned), download, rename, move, delete
- [ ] Per-user sharing (Viewer/Editor), revoke, list access
- [ ] Public share links with expiry + optional password
- [ ] Search by name/type/owner + sort/filter
- [ ] Starred/Favorites
- [ ] Trash with 30-day retention + restore + purge cron
- [ ] Session list + revoke (single and "all others") — required for `/security`
- [ ] Profile update + notification preferences — required for `/settings`

**MVP, but can stub minimally until asked for by name:**
- [ ] TOTP 2FA enable/confirm/disable
- [ ] OAuth connection list/disconnect (only relevant once Google/GitHub login is wired up)
- [ ] `/api/users/me/plan` — return a flat free-tier stub; real quotas are Phase 2

**Phase 2 — build after MVP is stable:**
- [ ] File version history + revert
- [ ] Thumbnails/previews (images, PDFs, text)
- [ ] Activity/audit log
- [ ] Tags/labels, bulk actions
- [ ] Fuzzy/full-text search upgrade (`pg_trgm`, `tsvector` — already indexed above)
- [ ] Usage/quota dashboard

---

## 13. Testing Requirements

- **Auth:** register/login/logout, refresh rotation, role checks.
- **Files:** init/complete upload, rename/move, soft delete + restore, signed download.
- **Shares:** grant/revoke, link expiry, link password, access-via-token.
- **Search:** by name, filters, pagination, fuzzy matching.
- **Rate limits:** burst testing to confirm limits actually trigger.

Use Jest for unit tests (services, validation) and Supertest for integration tests against a real test database.

---

## 14. Deployment

- Three environments: dev, staging, prod — separate databases and storage buckets per environment.
- GitHub Actions: lint → test → build on every PR; migrations run automatically on deploy.
- API hosted on Render/Fly.io/Heroku; DB + Storage on Supabase.
- Sentry for error tracking, Logtail/Datadog for logs, uptime monitoring on the API.
- Quarterly restore drills against the daily DB backups.

---

## 15. What NOT to build right now

Do not implement: real-time co-editing, complex org/team hierarchies, a desktop sync client, or any frontend code — the frontend is handled separately. Stay inside this document's scope until MVP checklist (Section 12) is fully green.
