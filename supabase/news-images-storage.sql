-- News Images Storage Bucket Setup
-- Run this in the Supabase SQL Editor or apply via Supabase CLI.
--
-- This creates a storage bucket for news article images and sets up
-- public read access with authenticated upload/delete policies.

insert into storage.buckets (id, name, public) values ('news-images', 'news-images', true)
on conflict (id) do nothing;

-- Public read access for all users (images are displayed on the detail page)
create policy "news images public read"
on storage.objects for select
using (bucket_id = 'news-images');

-- Authenticated users can upload images
create policy "news images authenticated upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'news-images');

-- Authenticated users can update their own images
create policy "news images authenticated update"
on storage.objects for update
to authenticated
using (bucket_id = 'news-images');

-- Authenticated users can delete images
create policy "news images authenticated delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'news-images');

-- Service role (used by the API routes) has full access by default.
-- The above policies cover the browser-authenticated admin path.
-- Internal assistant ingest uses the service role key, which bypasses RLS.
