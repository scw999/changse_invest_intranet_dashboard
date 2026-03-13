# Changsebot API Guide

Changsebot should treat `changse_invest_intranet_dashboard` as a trusted private data service.

## Helper File

Reusable assistant helper:

- `src/lib/integrations/changsebot-client.ts`

This file includes:

- direct trusted read helpers
- direct ingest helpers
- `findOne(...)`
- simple natural-language intent to payload transformation

## Auth

Every assistant-facing internal route must send:

```http
Authorization: Bearer <ASSISTANT_INGEST_TOKEN>
```

Do not use Telegram webhook auth for these routes.
Do not use user session auth for these routes.

Base URL:

```text
https://changse-invest-intranet-dashboard.vercel.app
```

## Routes

### Read / Search

- `POST /api/internal/search`
- `GET /api/internal/dataset/summary`

### Write / Ingest

- `POST /api/internal/ingest/news`
- `POST /api/internal/ingest/follow-ups`
- `POST /api/internal/ingest/portfolio`
- `POST /api/internal/ingest/tickers`
- `POST /api/internal/ingest/themes`

## Direct Search API

Use this before insert, update, or delete so the assistant can verify what already exists.

### Request

```json
{
  "scope": "portfolio",
  "query": "NVDA"
}
```

Valid scopes:

- `news`
- `followup`
- `portfolio`
- `ticker`
- `theme`

### Response

```json
{
  "ok": true,
  "scope": "portfolio",
  "query": "NVDA",
  "results": [
    {
      "ref": "abcd1234",
      "id": "full-row-id",
      "line": "[portfolio:abcd1234] NVDA NVIDIA"
    }
  ]
}
```

Behavior:

- empty `query` returns `400`
- output is compact and capped at 8 results
- `ref` is the short assistant-friendly handle to reuse in later update/delete calls

## Dataset Summary API

Use this for quick verification without loading the full private dataset.

### Response

```json
{
  "ok": true,
  "counts": {
    "themes": 12,
    "tickers": 48,
    "newsItems": 93,
    "followUps": 17,
    "portfolioItems": 11
  }
}
```

## Recommended Assistant Flow

### 1. Check if NVDA already exists in portfolio

```http
POST /api/internal/search
Authorization: Bearer <ASSISTANT_INGEST_TOKEN>
Content-Type: application/json

{
  "scope": "portfolio",
  "query": "NVDA"
}
```

### 2. Check if META ticker already exists

```http
POST /api/internal/search
Authorization: Bearer <ASSISTANT_INGEST_TOKEN>
Content-Type: application/json

{
  "scope": "ticker",
  "query": "META"
}
```

### 3. Search a theme

```http
POST /api/internal/search
Authorization: Bearer <ASSISTANT_INGEST_TOKEN>
Content-Type: application/json

{
  "scope": "theme",
  "query": "반도체"
}
```

### 4. Search a prior news item

```http
POST /api/internal/search
Authorization: Bearer <ASSISTANT_INGEST_TOKEN>
Content-Type: application/json

{
  "scope": "news",
  "query": "보조금"
}
```

## How Changsebot Should Use Search

Before writing:

1. Search by the most obvious key first.
2. If an exact existing row is found, prefer update over insert.
3. Save the returned `ref`.
4. Reuse that `ref` or full `id` for update/delete payloads.

Examples:

- portfolio insert candidate: search `portfolio` by symbol first
- ticker insert candidate: search `ticker` by symbol first
- news correction: search `news`, then update using returned `ref`
- follow-up update: search `news` or `followup`, then send `newsItemId`

## Natural Language Transformer

`transformNaturalLanguageToAction(input)` returns:

- inferred intent
- inferred operation
- draft payload
- missing fields
- recommended search hints

Example:

```ts
transformNaturalLanguageToAction("삼전 오늘 반도체 보조금 뉴스 추가해줘");
```

Typical result shape:

```json
{
  "intent": "news",
  "operation": "upsert",
  "payload": {
    "title": "삼전 오늘 반도체 보조금",
    "relatedTickerIds": ["005930.KS"],
    "relatedThemeIds": ["반도체"],
    "scanSlot": "09",
    "region": "KR"
  },
  "missingFields": ["sourceName", "sourceUrl", "actionIdea"],
  "searchHints": [
    {
      "scope": "news",
      "query": "삼전 오늘 반도체 보조금"
    }
  ]
}
```

Recommended flow:

1. Run `transformNaturalLanguageToAction(...)`
2. Ask the user only for `missingFields`
3. Run the suggested `searchHints`
4. Insert or update using the returned `ref`
