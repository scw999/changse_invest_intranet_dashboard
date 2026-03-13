begin;

create extension if not exists pgcrypto;

with invalid_themes as (
  select
    t.id,
    t.owner_id,
    t.name,
    case
      when nullif(trim(both '-' from regexp_replace(lower(btrim(t.name)), '[^a-z0-9]+', '-', 'g')), '') is not null
        then trim(both '-' from regexp_replace(lower(btrim(t.name)), '[^a-z0-9]+', '-', 'g'))
      else 'theme-' || substr(encode(digest(btrim(t.name), 'sha256'), 'hex'), 1, 12)
    end as base_slug
  from public.themes t
  where t.slug is null
     or btrim(t.slug) = ''
     or t.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
),
resolved_invalid_themes as (
  select
    it.id,
    case
      when exists (
        select 1
        from public.themes existing
        where existing.owner_id = it.owner_id
          and existing.slug = it.base_slug
          and existing.id <> it.id
      )
      or exists (
        select 1
        from invalid_themes other_invalid
        where other_invalid.owner_id = it.owner_id
          and other_invalid.base_slug = it.base_slug
          and other_invalid.id <> it.id
      )
        then it.base_slug || '-' || substr(encode(digest(it.owner_id::text || ':' || btrim(it.name), 'sha256'), 'hex'), 1, 8)
      else it.base_slug
    end as repaired_slug
  from invalid_themes it
)
update public.themes themes
set slug = resolved_invalid_themes.repaired_slug
from resolved_invalid_themes
where themes.id = resolved_invalid_themes.id;

alter table public.themes
  drop constraint if exists themes_slug_not_blank,
  drop constraint if exists themes_slug_format;

alter table public.themes
  add constraint themes_slug_not_blank check (length(btrim(slug)) > 0),
  add constraint themes_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

commit;
