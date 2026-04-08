-- Inline placement metadata for news image attachments.
-- Backwards compatible: existing rows default to placement = 'gallery' which
-- mirrors the previous "all images in the gallery section" behavior.

alter table public.news_item_images
  add column if not exists placement text not null default 'gallery';

alter table public.news_item_images
  add column if not exists anchor_key text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'news_item_images_placement_check'
  ) then
    alter table public.news_item_images
      add constraint news_item_images_placement_check
      check (placement in ('gallery', 'inline'));
  end if;
end;
$$;

-- Helps the read path quickly group inline images per (news_item, anchor).
create index if not exists idx_news_item_images_inline_anchor
  on public.news_item_images (news_item_id, anchor_key)
  where placement = 'inline';
