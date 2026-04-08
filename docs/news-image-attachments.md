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
  placement       text not null default 'gallery'
                  check (placement in ('gallery', 'inline')),
  anchor_key      text,                    -- stable id like "samsung-valuation"
  created_at      timestamptz not null,
  updated_at      timestamptz not null
)
```

Key properties:

- One news item can have many images.
- `display_order` is stable; render code always sorts by this value.
- `caption` and `alt` are first-class.
- `is_cover` lets one image act as the representative thumbnail.
- `placement` controls where the image renders: `'gallery'` (default, appears
  in the bottom "첨부 이미지" section) or `'inline'` (renders inside the
  article body, immediately after a matching anchored heading).
- `anchor_key` is the stable id the image targets when `placement = 'inline'`.
  Stored as plain lowercase text; the convention is kebab-case.
- Existing news rows have zero rows in this table, so they keep working unchanged.
- Existing image rows from before the inline-placement migration default to
  `placement = 'gallery'` and behave exactly like before.
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
- Maximum incoming upload size is **8 MB** per image (pre-optimization).
  Larger uploads return a 4xx error before the binary touches storage.
- Allowed mime types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`,
  `image/avif`.

External URLs (e.g. already-hosted screenshots) can be attached without
re-upload by passing `url` instead of `bufferBase64`.

## Upload-time optimization

To keep archive detail pages fast even when ChangseBot or an admin uploads a
multi-megabyte phone screenshot, every uploaded buffer is re-encoded server-side
**before** it ever reaches Supabase Storage. The implementation uses
[`sharp`](https://sharp.pixelplumbing.com/), the same native image library
Next.js uses internally for `next/image`.

### Exact behavior

| Aspect | Value |
|---|---|
| Library | `sharp` (libvips) |
| Max display dimension | **1600 px** on the longer side |
| Resize fit | `inside` with `withoutEnlargement: true` (never upscale) |
| Output format | **WebP** |
| Output quality | 82 (sharp `effort: 4`) |
| EXIF orientation | honored via `.rotate()` |
| EXIF metadata | **stripped** on re-encode (privacy) |
| Animated GIF | stored as-is (animation preserved, no resize) |
| Animated WebP / AVIF (`pages > 1`) | stored as-is |
| Decode failures | logged + stored as-is, never blocks the upload |
| Original buffer | **dropped** — only the optimized version is stored |

### What gets rendered

The detail page (`/archive/[id]`) renders `image.public_url`, which now points
**directly at the optimized WebP**. There is no separate "thumbnail" track or
"original" fallback — the single optimized version is what users see and
download. This keeps the storage footprint and the wire bytes both minimal.

If sharp cannot decode an input (e.g. an exotic format), the system falls back
to storing the original buffer as-is and logs a warning. The image still works,
it just isn't compressed.

### Measured impact

On synthetic test inputs the pipeline produced these reductions:

- 3000×2000 PNG (low-entropy fill): **96 % smaller** (83 KB → 3 KB)
- 3200×2000 high-entropy JPEG q95 (worst-case): **88 % smaller** (6.5 MB → 770 KB)

Real screenshots (text + UI chrome) compress further than the high-entropy
case. The practical ceiling for stored size after optimization is roughly
500–800 KB even for full-resolution Retina captures.

### Why a single optimized version, not original + thumbnail + display

- Detail pages only need one render target. A second "thumbnail" version would
  double storage and double upload latency for zero rendering benefit (list
  pages already render no images at all).
- Keeping the original would multiply storage cost without giving the dashboard
  anything to use it for. The post-optimization version is what appears in the
  detail gallery, the admin manager preview, and any future export.
- If this app ever needs print-quality export, the assistant payload still
  contains the source bytes — the user can re-upload from source if needed.

## Storage cleanup robustness

When an attachment is deleted (admin "삭제" button or assistant
`imageOperations.delete`):

1. The DB rows are deleted first.
2. The corresponding storage objects are removed via `storage.remove()`.
3. **If the storage call fails** (transient outage, permissions blip, etc.),
   the failed object paths are inserted into `news_image_cleanup_queue` along
   with the failure reason and the attempt timestamp.
4. The DB row deletion is **not** rolled back. The user already asked for the
   delete; we don't want a transient storage outage to block the dashboard.

The cleanup queue is a per-owner table protected by RLS. To drain orphans
later, run a small SQL maintenance step:

```sql
-- Inspect what's pending
select id, storage_path, failure_reason, attempts, created_at
from public.news_image_cleanup_queue
order by created_at;

-- After confirming with `storage.remove(...)` from the service-role client,
-- delete the queue entries that were successfully reaped:
delete from public.news_image_cleanup_queue where id = any(...);
```

This is intentionally a small, safe improvement: it does not introduce new
infrastructure (no cron, no worker), it never blocks the user, and it gives
operators a single audit point for orphaned files. A future iteration can wire
a periodic admin route that drains the queue automatically.

### Setup

1. Run `supabase/news-images-migration.sql` once on existing projects (this
   creates the table, the trigger, the RLS policy, and the storage bucket).
2. Run `supabase/news-images-inline-placement-migration.sql` once on existing
   projects to add the `placement` and `anchor_key` columns plus the inline
   index. The migration is idempotent and uses `add column if not exists`,
   so it is safe to re-run.
3. New deployments will get all columns from the updated `supabase/schema.sql`.
   The storage bucket still has to come from the bucket migration file because
   `storage.buckets` is not part of the base schema file.
4. No new environment variables are required. Image uploads reuse
   `SUPABASE_SERVICE_ROLE_KEY` from the existing trusted server path.

## Inline placement model

By default, attached images render in the bottom "첨부 이미지" gallery
section. With the inline-placement model, ChangseBot or an admin can pin
specific images directly into the article flow next to the relevant content,
without relying on fragile heading-text matching.

### Anchor convention

Any markdown heading line in the `marketInterpretation` field can carry a
**stable anchor id** by appending `{#anchor-id}` at the end:

```markdown
## 상단 요약 카드
- 핵심 1
- 핵심 2

## 사실
### 삼성전자 저평가 논점 {#samsung-valuation}
본문 ...

### 사모대출 불안 {#private-credit-risk}
본문 ...

### 트럼프 48시간 발언 {#trump-48h}
본문 ...

## 시장 해석 {#market-interpretation}
본문 ...

## 창세봇 의견 {#bot-opinion}
본문 ...

## Bull {#bull}
본문 ...

## Bear {#bear}
본문 ...

## 실행 아이디어 {#action-ideas}
본문 ...

## 체크포인트 {#checkpoints}
본문 ...
```

Rules:

- Anchor id must be lowercase, max 80 chars, allowed characters
  `[a-z0-9_-]`, must start and end with alphanumeric.
- Heading text **before** the `{#id}` may be edited freely without breaking
  placement. Only the `{#id}` part is the stable contract.
- Headings without `{#id}` work normally — they just cannot host inline
  images.
- Mixed structure is fine: some headings can have anchors, others not. The
  parser scans the body once on every detail-page render and produces
  deterministic sections.
- Duplicate anchor ids in the same body are tolerated; only the first
  occurrence is used as the placement target so the result stays predictable.

### Image placement metadata

Each `news_item_images` row carries two new fields:

| Field | Values | Purpose |
|---|---|---|
| `placement` | `"gallery"` (default) \| `"inline"` | Where the image renders |
| `anchor_key` | nullable lowercase text | Required for inline placement |

The server-side resolver in `news-images.ts` enforces an invariant:
**inline placement requires a valid `anchor_key`**. If `placement = 'inline'`
is sent without a valid `anchor_key`, or with one that fails normalization,
the row is silently downgraded to `placement = 'gallery'` instead of being
rejected. This means image attachments can never be silently dropped just
because their placement metadata is wrong.

At render time the detail page additionally checks that the `anchor_key`
actually exists in the current body. If the body has been edited and the
target heading is gone, the inline image **falls back to the gallery section**
for that render — it is never silently hidden.

### Rendering behavior on the detail page

The "시장 해석" section now renders body + inline images **interleaved**:

1. The body is parsed into anchored sections by the line-scan parser.
2. Each section is rendered as `<RichText>`.
3. Immediately after a section, every inline image whose `anchor_key` matches
   that section's anchor renders as a `<figure>` with caption + alt.
4. Multiple inline images can target the same anchor; they render in
   `display_order`.
5. The bottom "첨부 이미지" section now contains only the **fallback gallery**:
   any image with `placement = 'gallery'`, plus any inline image whose anchor
   could not be resolved against the current body. If the gallery list is
   empty, the entire section is hidden.

All examples target `POST /api/internal/ingest/news` with the existing
`Authorization: Bearer <ASSISTANT_INGEST_TOKEN>` header.

### Create a post with inline-anchored images

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
  "marketInterpretation": "## 사실\n### 삼성전자 저평가 논점 {#samsung-valuation}\n...\n### 사모대출 불안 {#private-credit-risk}\n...\n### 트럼프 48시간 발언 {#trump-48h}\n...",
  "directionalView": "Mixed",
  "actionIdea": "실행 아이디어...",
  "followUpStatus": "Pending",
  "followUpNote": "후속 확인 포인트",
  "importance": "High",
  "images": [
    {
      "filename": "samsung.jpg",
      "contentType": "image/jpeg",
      "caption": "삼성전자 저평가 이슈 화면",
      "alt": "삼성전자 관련 이미지",
      "order": 1,
      "placement": "inline",
      "anchorKey": "samsung-valuation",
      "bufferBase64": "<base64>"
    },
    {
      "filename": "private-credit.jpg",
      "contentType": "image/jpeg",
      "caption": "사모대출 이슈 화면",
      "alt": "사모대출 관련 이미지",
      "order": 2,
      "placement": "inline",
      "anchorKey": "private-credit-risk",
      "bufferBase64": "<base64>"
    },
    {
      "filename": "trump-48h.jpg",
      "contentType": "image/jpeg",
      "caption": "트럼프 48시간 발언 화면",
      "alt": "트럼프 발언 관련 이미지",
      "order": 3,
      "placement": "inline",
      "anchorKey": "trump-48h",
      "bufferBase64": "<base64>"
    }
  ]
}
```

### Create a post with gallery-only images (legacy / unchanged)

Omit `placement` and `anchorKey` to keep the old behavior. Images render in
the bottom "첨부 이미지" gallery section just like before.

```json
{
  "operation": "upsert",
  "title": "...",
  "marketInterpretation": "...",
  "images": [
    {
      "filename": "screenshot.jpg",
      "contentType": "image/jpeg",
      "caption": "참고 이미지",
      "order": 1,
      "bufferBase64": "<base64>"
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

### Update image metadata (including placement and anchor)

```json
{
  "operation": "upsert",
  "id": "existing-record-id",
  "imageOperations": {
    "update": [
      {
        "imageId": "img-1",
        "placement": "inline",
        "anchorKey": "samsung-valuation",
        "caption": "수정된 캡션",
        "alt": "수정된 alt",
        "order": 1
      },
      {
        "imageId": "img-2",
        "placement": "gallery",
        "order": 2
      }
    ]
  }
}
```

`placement` and `anchorKey` are coupled. When the server processes the
update it re-resolves the pair against the current row, so:

- Sending only `placement: "inline"` keeps the existing anchor.
- Sending only `anchorKey: "..."` keeps the existing placement.
- Sending `placement: "gallery"` clears `anchor_key` automatically.
- Sending `anchorKey: null` (explicit JSON null) clears the anchor and
  forces gallery placement.
- Sending `placement: "inline"` with an invalid or missing anchor key
  silently downgrades to `gallery` instead of failing the request.

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
- See attached images sorted by order, with thumbnail, caption, alt, cover
  flag, and **a placement badge** (`갤러리` or `인라인 · <anchor-key>`).
- Edit caption / alt and save the metadata.
- **Switch placement between gallery and inline**, and edit `anchorKey` for
  inline images. The anchor input is paired with a `<datalist>` populated by
  the anchors detected in the current `marketInterpretation` body, so the
  admin gets autocomplete suggestions instead of typing blindly.
- Reorder via "위로" / "아래로" buttons (server reorder uses `imageOperations.reorder`).
- Mark a representative cover image (`isCover`).
- Delete an image.

Anchor suggestions are derived live from the current article body via
`extractArticleAnchors()` from `src/lib/article-anchors.ts`, so the suggestion
list stays in sync with whatever the admin sees in the editor without any
extra API call.

If the admin selects `inline` but does not provide a valid anchor id, the
manager surfaces an inline error before sending the request, so the user
gets immediate feedback rather than silently being downgraded to gallery
on the server.

All operations go through the existing `PATCH /api/private/admin/news` route,
which now accepts an `imageOperations` body with `placement` and `anchorKey`
fields. Sending an image-only PATCH still does not require the full news
payload.

## Archive detail rendering

The detail page (`/archive/[id]`) does this in order:

1. **Parse the body once.** `parseArticleSections()` walks the body line by
   line, splitting it into anchored sections. Headings without `{#id}` stay in
   the previous section. The first section (the preamble) holds everything
   before the first anchored heading.
2. **Render the article inside "시장 해석".** Each parsed section is handed to
   `<RichText>`. Immediately after each anchored section, every inline image
   targeting that anchor renders as a `<figure>`.
3. **Render the gallery fallback.** Any image with `placement = 'gallery'`,
   plus any inline image whose anchor could not be resolved against the
   current body, falls into the bottom "첨부 이미지" section. If the gallery
   list is empty, the section is hidden entirely.

Existing text-only posts and existing gallery-style posts both render
unchanged: with no `{#id}` headings the body becomes a single preamble
section that renders identically to the old single `<RichText>` block, and
the gallery section behaves exactly like before.

## Performance choices

The non-functional requirement was: site speed must not regress.

- **Server-side optimization on upload.** Every uploaded image is decoded with
  sharp, resized to fit within 1600×1600, and re-encoded to WebP @ q82 before
  it reaches storage. A 6 MB phone screenshot becomes a ~500 KB asset. Detail
  pages render this optimized version directly.
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
  through the Next.js optimizer on every request. Now that the upload pipeline
  produces a small WebP asset and the bucket sends long-cache headers, the
  optimizer is no longer needed.
- **One parallel query.** The new `news_item_images` query is added to the
  existing `Promise.all` block, so the dataset still completes in one round of
  parallel fetches.
- **Cover URL precomputed.** The dataset returns a `coverImageUrl` derived once
  on the server, so list rendering does not need to scan an array on every
  render.

## Backward compatibility

- Existing news rows with no attachments work unchanged. The detail page only
  renders the gallery section when at least one fallback image exists.
- Existing image attachments default to `placement = 'gallery'` after the
  inline-placement migration runs, which exactly mirrors the previous "all
  images in the gallery" behavior.
- Admin and assistant payloads that omit `placement`, `anchorKey`, `images`,
  and `imageOperations` behave exactly the same as before.
- Bodies without any `{#id}` headings render exactly as before — the parser
  produces a single preamble section and no inline-image lookup ever runs.
- The `NewsItem.images` field is optional in TypeScript, so mock data and any
  existing seed paths do not need to be modified.
- The migrations are additive: no existing column or row is changed.

## Limitations / future work

- Drag-and-drop reorder is not implemented; the admin uses up/down buttons.
  Reorder still goes through a single batched server call.
- Cover image is selected manually. There is no auto-pick beyond "first image
  in order" which is what the dataset returns when no `is_cover` flag is set.
- The cleanup queue is drained manually for now (small SQL maintenance step).
  A future iteration can add an admin route that drains the queue
  automatically.
- Animated GIF / animated WebP / animated AVIF are stored as-is so animation
  is preserved. They are not resized. If a multi-megabyte animated GIF is
  uploaded, it will still be served as-is. Prefer static screenshots when
  possible.
- `next/image` is still not used. If the deployment ever wants framework-driven
  responsive `srcset`, configuring `images.remotePatterns` for the project's
  Supabase URL is the migration path.
- Inline placement only resolves against the `marketInterpretation` body. The
  `actionIdea` and `followUpNote` blocks render as plain markdown without
  inline-image support. This was a deliberate scope choice — the long-form
  body is where the assistant's structured templates live.
- The anchor parser handles `{#id}` only on heading lines. Inline anchors
  (e.g. mid-paragraph markers) are intentionally not supported because they
  break visual flow and are not necessary for the operational use case.
