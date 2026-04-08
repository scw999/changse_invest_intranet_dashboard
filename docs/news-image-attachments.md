# News Image Attachments

This document describes the end-to-end image attachment flow for archive / news
records. It covers the data model, storage path, assistant (ChangseBot) ingest
payloads, the admin UI, and the performance trade-offs.

## Data model

A new table backs every image attachment:

```sql
public.news_item_images (
  id              uuid primary key,
  owner_id        uuid not null,
  news_item_id    uuid not null references public.news_items(id) on delete cascade,
  storage_path    text not null,           -- key inside the news-images bucket
  public_url      text not null,           -- denormalized so list/detail loads stay cheap
  mime_type       text not null,
  file_size       integer,                 -- not loaded on read paths
  width           integer,
  height          integer,
  caption         text not null default '',
  alt             text not null default '',
  display_order   integer not null default 0,
  is_cover        boolean not null default false,
  created_at      timestamptz not null,
  updated_at      timestamptz not null
)
```

Key properties:

- One news item can have many images.
- `display_order` is stable; render code always sorts by this value.
- `caption` and `alt` are first-class.
- `is_cover` lets one image act as the representative thumbnail.
- Existing news rows have zero rows in this table, so they keep working unchanged.
- RLS mirrors `news_items`: only the owner can read/write.
- `news_item_id` cascade deletes all images when a news row is removed.

Two indexes back the read path:

- `idx_news_item_images_owner_news_order (owner_id, news_item_id, display_order)`
- `idx_news_item_images_news_id (news_item_id)`

## Storage

Image binaries live in a Supabase Storage bucket called **`news-images`**.

- Bucket is **public**. The dashboard renders attachments without minting signed
  URLs on every load, which keeps archive detail fast.
- Object keys are namespaced as `<owner_id>/<news_item_id>/<random>.<ext>` so
  cross-owner enumeration is unattractive.
- The internal upload helper sets
  `Cache-Control: public, max-age=31536000, immutable` so CDN/browser caching is
  effective for the lifetime of the asset.
- Maximum upload size is **8 MB** per image. Larger uploads return a 4xx error
  before the binary touches storage.
- Allowed mime types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`,
  `image/avif`.

External URLs (e.g. already-hosted screenshots) can be attached without
re-upload by passing `url` instead of `bufferBase64`.

### Setup

1. Run `supabase/news-images-migration.sql` once on existing projects (this
   creates the table, the trigger, the RLS policy, and the storage bucket).
2. New deployments will get the table from the updated `supabase/schema.sql`.
   The storage bucket still has to come from the migration file because
   `storage.buckets` is not part of the base schema file.
3. No new environment variables are required. Image uploads reuse
   `SUPABASE_SERVICE_ROLE_KEY` from the existing trusted server path.

## Assistant / internal ingest

All examples target `POST /api/internal/ingest/news` with the existing
`Authorization: Bearer <ASSISTANT_INGEST_TOKEN>` header.

### Create a post with images

```json
{
  "operation": "upsert",
  "contentType": "analysis",
  "title": "세현 2026-04-08 업무보고 요약",
  "summary": "세현님 업무보고와 첨부 이미지 기준으로 정리한 리포트",
  "sourceName": "세현 업무보고",
  "sourceUrl": "https://www.hankyung.com/",
  "publishedAt": "2026-04-08T16:24:00+09:00",
  "scanSlot": "13",
  "region": "GLOBAL",
  "affectedAssetClasses": ["Equities"],
  "marketInterpretation": "본문...",
  "directionalView": "Mixed",
  "actionIdea": "실행 아이디어...",
  "followUpStatus": "Pending",
  "followUpNote": "후속 확인 포인트",
  "importance": "High",
  "images": [
    {
      "filename": "private-credit-slide.jpg",
      "contentType": "image/jpeg",
      "caption": "사모대출 이슈 참고 이미지",
      "alt": "사모대출 이슈 슬라이드",
      "order": 1,
      "bufferBase64": "<base64 image data>"
    },
    {
      "filename": "trump-48h.jpg",
      "contentType": "image/jpeg",
      "caption": "트럼프 48시간 발언 참고 이미지",
      "alt": "트럼프 48시간 관련 이미지",
      "order": 2,
      "bufferBase64": "<base64 image data>"
    }
  ]
}
```

### Add more images to an existing post

You can patch only the fields you want; other text fields are preserved.

```json
{
  "operation": "upsert",
  "id": "existing-record-id",
  "marketInterpretation": "updated body...",
  "images": [
    {
      "filename": "new-image.jpg",
      "contentType": "image/jpeg",
      "caption": "새 이미지",
      "alt": "새 이미지 alt",
      "order": 3,
      "bufferBase64": "<base64 image data>"
    }
  ]
}
```

### Reorder images

```json
{
  "operation": "upsert",
  "id": "existing-record-id",
  "imageOperations": {
    "reorder": [
      { "imageId": "img-1", "order": 1 },
      { "imageId": "img-2", "order": 2 },
      { "imageId": "img-3", "order": 3 }
    ]
  }
}
```

### Update image metadata

```json
{
  "operation": "upsert",
  "id": "existing-record-id",
  "imageOperations": {
    "update": [
      {
        "imageId": "img-1",
        "caption": "수정된 캡션",
        "alt": "수정된 alt",
        "order": 1,
        "isCover": true
      }
    ]
  }
}
```

When `isCover: true` is set on any image, the server automatically clears the
flag on every other image attached to the same news item.

### Delete images

```json
{
  "operation": "upsert",
  "id": "existing-record-id",
  "imageOperations": {
    "delete": ["img-2", "img-5"]
  }
}
```

Row deletion happens first, then storage objects are removed in a best-effort
cleanup pass. If the storage cleanup fails (transient outage, etc.) the row
deletion still succeeds and a warning is logged.

### Replace all images at once

```json
{
  "operation": "upsert",
  "id": "existing-record-id",
  "imageOperations": {
    "replaceAll": true,
    "add": [
      {
        "filename": "v2.jpg",
        "contentType": "image/jpeg",
        "bufferBase64": "<base64>"
      }
    ]
  }
}
```

`replaceAll` removes every existing attachment for that news item before the
`add` list is processed.

### Attach an image hosted elsewhere

```json
{
  "operation": "upsert",
  "id": "existing-record-id",
  "images": [
    {
      "url": "https://example.com/external-screenshot.png",
      "caption": "외부 호스팅 이미지",
      "alt": "외부 이미지"
    }
  ]
}
```

External URLs are stored as `external/<original-url>` in `storage_path` so the
cleanup pass knows not to attempt deletion in the Supabase bucket.

## Admin UI

`/admin` now exposes a per-row image manager inside the existing news list
under "기존 뉴스 목록".

For each news item the admin can:

- Upload one or more images (multi-file picker; client-side base64 encode).
- See attached images sorted by order, with thumbnail, caption, alt, cover flag.
- Edit caption / alt and save the metadata.
- Reorder via "위로" / "아래로" buttons (server reorder uses `imageOperations.reorder`).
- Mark a representative cover image (`isCover`).
- Delete an image.

All operations go through the existing `PATCH /api/private/admin/news` route,
which now accepts an `imageOperations` body and an optional `images` body for
"add only" calls. Sending an image-only PATCH no longer requires the full news
payload.

## Archive detail rendering

The detail page (`/archive/[id]`) renders a "첨부 이미지" section above the
market interpretation when the news item has at least one attachment. Images are
sorted by `order`, the caption is rendered below each image, and the layout is
a two-column responsive grid that collapses to one column on mobile.

Existing posts without any attachments do not show the section at all, so they
render exactly the same as before.

## Performance choices

The non-functional requirement was: site speed must not regress.

- **No image data on list pages.** Card and dashboard list components do not
  render images at all. Even with many attachments per record, the list pages
  download nothing extra beyond a single denormalized URL string per attachment.
- **Lightweight read query.** `fetchResearchDataset` selects only the columns
  needed to render: `id, news_item_id, public_url, storage_path, mime_type,
  caption, alt, display_order, is_cover`. Big metadata columns
  (`file_size`, `width`, `height`) are NOT loaded on the read path.
- **Public bucket + immutable cache control.** Images are served directly from
  Supabase Storage with `Cache-Control: public, max-age=31536000, immutable`.
  No server-side proxy and no per-request signing.
- **Native lazy + async decode.** All `<img>` tags use
  `loading="lazy" decoding="async"` so images below the fold do not block the
  initial paint.
- **Plain `<img>` instead of `next/image`.** Using `next/image` would require
  configuring `images.remotePatterns` for the user's specific Supabase project
  URL (which differs per deployment) and would also serialize image metadata
  through the Next.js optimizer on every request. Plain `<img>` with the
  bucket's CDN-friendly headers is faster for this use case and does not need
  per-deploy config.
- **One parallel query.** The new `news_item_images` query is added to the
  existing `Promise.all` block, so the dataset still completes in one round of
  parallel fetches.
- **Cover URL precomputed.** The dataset returns a `coverImageUrl` derived once
  on the server, so list rendering does not need to scan an array on every
  render.

## Backward compatibility

- Existing news rows with no attachments work unchanged. The detail page only
  renders the image section when `images.length > 0`.
- Admin and assistant payloads that omit `images` and `imageOperations` behave
  exactly the same as before.
- The `NewsItem.images` field is optional in TypeScript, so mock data and any
  existing seed paths do not need to be modified.
- The migration is additive: no existing column or row is changed.

## Limitations / future work

- Drag-and-drop reorder is not implemented; the admin uses up/down buttons.
  Reorder still goes through a single batched server call.
- No automatic resize / thumbnail generation. The admin should compress images
  before upload for very large screenshots.
- Cover image is selected manually. There is no auto-pick beyond "first image
  in order" which is what the dataset returns when no `is_cover` flag is set.
- Cleanup of Supabase Storage objects is best-effort; if the storage call fails
  the database row deletion still succeeds. Run the included migration on a new
  project to ensure the bucket exists.
