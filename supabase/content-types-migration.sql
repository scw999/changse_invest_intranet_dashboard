alter table public.news_items
  add column if not exists content_type text not null default 'news';

alter table public.news_items
  add column if not exists content_meta jsonb not null default '{}'::jsonb;

update public.news_items
set content_type = 'news'
where content_type is null
   or btrim(content_type) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'news_items_content_type_check'
  ) then
    alter table public.news_items
      add constraint news_items_content_type_check
      check (content_type in ('news', 'analysis', 'opinion', 'monitoring'));
  end if;
end;
$$;

create index if not exists idx_news_items_owner_content_type
  on public.news_items (owner_id, content_type, published_at desc);
