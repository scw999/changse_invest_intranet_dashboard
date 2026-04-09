-- News item image attachments
-- Backwards compatible: existing news_items keep working with no images.

create table if not exists public.news_item_images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  news_item_id uuid not null references public.news_items(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  mime_type text not null default 'image/jpeg',
  file_size integer,
  width integer,
  height integer,
  caption text not null default '',
  alt text not null default '',
  display_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_news_item_images_owner_news_order
  on public.news_item_images (owner_id, news_item_id, display_order);

create index if not exists idx_news_item_images_news_id
  on public.news_item_images (news_item_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_news_item_images_updated_at'
  ) then
    create trigger set_news_item_images_updated_at
    before update on public.news_item_images
    for each row execute procedure public.set_updated_at();
  end if;
end;
$$;

alter table public.news_item_images enable row level security;

drop policy if exists "news image owner access" on public.news_item_images;
create policy "news image owner access" on public.news_item_images
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Storage bucket for image binaries.
-- Public bucket so the dashboard can render images without minting signed URLs on every load.
-- Owner_id namespacing on the path keeps cross-owner enumeration unattractive.
insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do update set public = excluded.public;

-- Best-effort cleanup queue: when a news_item_images row is deleted but the
-- corresponding storage object cannot be removed (transient outage, etc.), the
-- failed storage path is recorded here so a periodic sweep can reap orphans.
create table if not exists public.news_image_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  storage_path text not null,
  failure_reason text not null default '',
  attempts integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  last_attempt_at timestamptz
);

create index if not exists idx_news_image_cleanup_queue_owner_created
  on public.news_image_cleanup_queue (owner_id, created_at desc);

alter table public.news_image_cleanup_queue enable row level security;

drop policy if exists "news image cleanup owner access" on public.news_image_cleanup_queue;
create policy "news image cleanup owner access" on public.news_image_cleanup_queue
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
