create extension if not exists pgcrypto;

create type public.scan_slot as enum ('09', '13', '18', '22');
create type public.region_code as enum ('KR', 'US', 'GLOBAL');
create type public.asset_class as enum ('Equities', 'Rates', 'FX', 'Commodities', 'Crypto', 'ETF');
create type public.directional_view as enum ('Bullish', 'Bearish', 'Neutral', 'Mixed');
create type public.follow_up_status as enum ('Pending', 'Correct', 'Wrong', 'Mixed');
create type public.importance_level as enum ('Critical', 'High', 'Medium', 'Low');
create type public.portfolio_asset_type as enum ('Stock', 'ETF', 'Bond', 'Commodity', 'Crypto', 'FX', 'Cash');
create type public.priority_level as enum ('Critical', 'High', 'Medium', 'Low');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  slug text not null,
  name text not null,
  description text not null default '',
  category text not null,
  priority public.priority_level not null default 'Medium',
  color text not null default '#355c7d',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (length(btrim(slug)) > 0),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  unique (owner_id, slug),
  unique (owner_id, name)
);

create table public.tickers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  symbol text not null,
  name text not null,
  exchange text not null default '',
  region public.region_code not null,
  asset_class public.asset_class not null,
  note text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, symbol)
);

create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  content_type text not null default 'news' check (content_type in ('news', 'analysis', 'opinion', 'monitoring')),
  title text not null,
  summary text not null default '',
  source_name text not null default '',
  source_url text not null default '',
  published_at timestamptz not null,
  scan_slot public.scan_slot not null,
  region public.region_code not null,
  affected_asset_classes public.asset_class[] not null default '{}',
  market_interpretation text not null default '',
  directional_view public.directional_view not null default 'Neutral',
  action_idea text not null default '',
  follow_up_status public.follow_up_status not null default 'Pending',
  follow_up_note text not null default '',
  importance public.importance_level not null default 'Medium',
  content_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.news_item_themes (
  owner_id uuid not null default auth.uid(),
  news_item_id uuid not null references public.news_items(id) on delete cascade,
  theme_id uuid not null references public.themes(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (news_item_id, theme_id)
);

create table public.news_item_tickers (
  owner_id uuid not null default auth.uid(),
  news_item_id uuid not null references public.news_items(id) on delete cascade,
  ticker_id uuid not null references public.tickers(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (news_item_id, ticker_id)
);

create table public.follow_up_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  news_item_id uuid not null references public.news_items(id) on delete cascade,
  status public.follow_up_status not null default 'Pending',
  resolved_at timestamptz,
  outcome_summary text not null default '',
  result_note text not null default '',
  market_impact text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  symbol text not null,
  asset_name text not null,
  asset_type public.portfolio_asset_type not null,
  region public.region_code not null,
  is_holding boolean not null default false,
  is_watchlist boolean not null default true,
  weight numeric(8, 2),
  average_cost numeric(18, 4),
  memo text,
  priority public.priority_level not null default 'Medium',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, symbol),
  check (is_holding or is_watchlist)
);

create table public.user_preferences (
  owner_id uuid primary key default auth.uid(),
  timezone text not null default 'Asia/Seoul',
  preferred_sort text not null default 'importance',
  favorite_slots public.scan_slot[] not null default array['09', '18']::public.scan_slot[],
  default_regions public.region_code[] not null default array['KR', 'US']::public.region_code[],
  compact_mode boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (preferred_sort in ('latest', 'importance', 'followUp', 'source'))
);

create table public.user_theme_interests (
  owner_id uuid not null default auth.uid(),
  theme_id uuid not null references public.themes(id) on delete cascade,
  priority public.priority_level not null default 'Medium',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (owner_id, theme_id)
);

create index idx_news_items_owner_published_at on public.news_items (owner_id, published_at desc);
create index idx_news_items_owner_slot on public.news_items (owner_id, scan_slot);
create index idx_news_items_owner_region on public.news_items (owner_id, region);
create index idx_news_items_owner_importance on public.news_items (owner_id, importance);
create index idx_news_items_owner_content_type on public.news_items (owner_id, content_type, published_at desc);
create index idx_follow_up_records_owner_status on public.follow_up_records (owner_id, status, resolved_at desc);
create index idx_portfolio_items_owner_priority on public.portfolio_items (owner_id, priority);
create index idx_tickers_owner_region on public.tickers (owner_id, region);
create index idx_news_item_themes_theme on public.news_item_themes (theme_id);
create index idx_news_item_tickers_ticker on public.news_item_tickers (ticker_id);

create trigger set_themes_updated_at
before update on public.themes
for each row execute procedure public.set_updated_at();

create trigger set_tickers_updated_at
before update on public.tickers
for each row execute procedure public.set_updated_at();

create trigger set_news_items_updated_at
before update on public.news_items
for each row execute procedure public.set_updated_at();

create trigger set_follow_up_records_updated_at
before update on public.follow_up_records
for each row execute procedure public.set_updated_at();

create trigger set_portfolio_items_updated_at
before update on public.portfolio_items
for each row execute procedure public.set_updated_at();

create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row execute procedure public.set_updated_at();

alter table public.themes enable row level security;
alter table public.tickers enable row level security;
alter table public.news_items enable row level security;
alter table public.news_item_themes enable row level security;
alter table public.news_item_tickers enable row level security;
alter table public.follow_up_records enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_theme_interests enable row level security;

create policy "themes owner access" on public.themes
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "tickers owner access" on public.tickers
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "news owner access" on public.news_items
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "news theme owner access" on public.news_item_themes
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "news ticker owner access" on public.news_item_tickers
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "follow-up owner access" on public.follow_up_records
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "portfolio owner access" on public.portfolio_items
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "preferences owner access" on public.user_preferences
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "theme interests owner access" on public.user_theme_interests
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
