create extension if not exists pg_trgm;

-- =========================================================================
-- CloudFS schema (PostgreSQL / Supabase)
-- Mirrors the in-memory store. Apply this when DATABASE_URL is configured.
-- =========================================================================

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  image_url text,
  password_hash text,
  two_factor_enabled boolean default false,
  two_factor_secret text,
  providers jsonb default '{}'::jsonb,
  quota_bytes bigint default 107374182400,
  created_at timestamptz default now()
);

create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references users(id) on delete cascade,
  parent_id uuid references folders(id) on delete set null,
  is_deleted boolean default false,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists folders_unique_name
  on folders(owner_id, parent_id, name) where is_deleted = false;
create index if not exists folders_owner on folders(owner_id);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mime_type text,
  size_bytes bigint,
  storage_key text unique not null,
  owner_id uuid references users(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  version_id uuid,
  checksum text,
  status text default 'ready',
  is_deleted boolean default false,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists files_owner on files(owner_id);
create index if not exists files_folder on files(folder_id);
create index if not exists files_name_trgm on files using gin (name gin_trgm_ops);
create index if not exists files_updated on files(updated_at desc);

create table if not exists file_versions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references files(id) on delete cascade,
  version_number int not null,
  storage_key text not null,
  size_bytes bigint,
  checksum text,
  created_at timestamptz default now()
);
create index if not exists versions_file on file_versions(file_id);

create table if not exists shares (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  grantee_user_id uuid references users(id) on delete cascade,
  role text not null check (role in ('viewer','editor')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  unique(resource_type, resource_id, grantee_user_id)
);
create index if not exists shares_grantee on shares(grantee_user_id);
create index if not exists shares_resource on shares(resource_type, resource_id);

create table if not exists link_shares (
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
create index if not exists link_shares_token on link_shares(token);

create table if not exists stars (
  user_id uuid references users(id) on delete cascade,
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  created_at timestamptz default now(),
  primary key (user_id, resource_type, resource_id)
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  action text not null check (action in ('upload','rename','delete','restore','move','share','download')),
  resource_type text not null check (resource_type in ('file','folder')),
  resource_id uuid not null,
  context jsonb,
  created_at timestamptz default now()
);
create index if not exists activities_created on activities(created_at desc);
create index if not exists activities_actor on activities(actor_id, created_at desc);

create table if not exists sessions (
  id text primary key,
  user_id uuid references users(id) on delete cascade,
  device text,
  os text,
  browser text,
  ip text,
  user_agent text,
  last_active_at timestamptz default now(),
  created_at timestamptz default now(),
  revoked_at timestamptz
);
create index if not exists sessions_user on sessions(user_id, last_active_at desc);

create table if not exists user_settings (
  user_id uuid primary key references users(id) on delete cascade,
  plan text default 'free',
  notifications jsonb default '{"email": true, "share": true, "security": true}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  type text not null,
  title text,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists notifications_user on notifications(user_id, created_at desc);

-- Row-level security policies should be added when wiring Supabase Auth.
-- Example (apply per-table, customized by role):
--   alter table files enable row level security;
--   create policy files_owner_select on files for select using (owner_id = auth.uid());
--   create policy files_shared_select on files for select using (
--     exists (select 1 from shares where shares.resource_id = files.id and shares.grantee_user_id = auth.uid())
--   );
