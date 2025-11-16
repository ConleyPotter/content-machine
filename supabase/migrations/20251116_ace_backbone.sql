-- ============================================================
-- ACE Autonomous Content Engine
-- Month-One Data Backbone Migration
-- ============================================================

-- ============================
-- 1. PRODUCTS
-- ============================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  niche text,
  affiliate_link text,
  created_at timestamptz default now()
);

-- Ensure the niche column exists
alter table products 
  add column if not exists niche text;

-- Index for fast lookup by niche
create index if not exists idx_products_niche on products(niche);


-- ============================
-- 2. SCRIPTS
-- ============================

create table if not exists scripts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  script_text text not null,
  hook text,
  creative_variables jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_scripts_product_id on scripts(product_id);


-- ============================
-- 3. VIDEO ASSETS
-- ============================

create table if not exists video_assets (
  id uuid primary key default gen_random_uuid(),
  script_id uuid references scripts(id) on delete set null,
  storage_path text not null,
  thumbnail_path text,
  duration_seconds int,
  created_at timestamptz default now()
);

create index if not exists idx_video_assets_script_id on video_assets(script_id);


-- ============================
-- 4. EXPERIMENTS
-- ============================

create table if not exists experiments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  script_id uuid references scripts(id) on delete set null,
  asset_id uuid references video_assets(id) on delete set null,
  hypothesis text,
  variation_label text,
  created_at timestamptz default now()
);

create index if not exists idx_experiments_product_id on experiments(product_id);
create index if not exists idx_experiments_script_id on experiments(script_id);


-- ============================
-- 5. PUBLISHED POSTS
-- ============================

create table if not exists published_posts (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid references experiments(id) on delete cascade,
  platform text not null,
  platform_post_id text,
  caption text,
  hashtags text[],
  posted_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_published_posts_experiment_id 
  on published_posts(experiment_id);


-- ============================
-- 6. PERFORMANCE METRICS
-- ============================

create table if not exists performance_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references published_posts(id) on delete cascade,
  view_count bigint,
  like_count int,
  share_count int,
  comment_count int,
  watch_time_ms bigint,
  completion_rate numeric,
  collected_at timestamptz default now()
);

create index if not exists idx_performance_metrics_post_id 
  on performance_metrics(post_id);


-- ============================
-- 7. AGENT NOTES
-- ============================

create table if not exists agent_notes (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  topic text,
  content text not null,
  importance int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_agent_notes_agent_name 
  on agent_notes(agent_name);


-- ============================
-- 8. TREND SNAPSHOTS
-- ============================

create table if not exists trend_snapshots (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  raw_data jsonb not null,
  collected_at timestamptz default now()
);

create index if not exists idx_trend_snapshots_platform 
  on trend_snapshots(platform);


-- ============================
-- 9. SYSTEM EVENTS
-- ============================

create table if not exists system_events (
  id uuid primary key default gen_random_uuid(),
  agent_name text,
  event_type text not null,
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_system_events_agent_name 
  on system_events(agent_name);
create index if not exists idx_system_events_event_type 
  on system_events(event_type);

-- ============================================================
-- END OF MIGRATION
-- ============================================================
