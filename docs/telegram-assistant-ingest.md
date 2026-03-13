# Telegram Assistant Ingest

This app supports a private trusted-assistant flow:

1. User sends a Telegram request to Changsebot.
2. Changsebot interprets intent and structures the payload.
3. Changsebot optionally checks existing private data through the direct assistant search API.
4. Changsebot calls the internal ingest API with `ASSISTANT_INGEST_TOKEN`.

## Trusted Assistant Read Paths

These routes exist so the assistant can verify private data without depending on Telegram command routing.

### `POST /api/internal/search`

Example:

```json
{
  "scope": "ticker",
  "query": "META"
}
```

Example response:

```json
{
  "ok": true,
  "scope": "ticker",
  "query": "META",
  "results": [
    {
      "ref": "abcd1234",
      "id": "full-row-id",
      "line": "[ticker:abcd1234] META Meta Platforms"
    }
  ]
}
```

### `GET /api/internal/dataset/summary`

Example response:

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

## Auth

All assistant-facing internal routes require:

```http
Authorization: Bearer <ASSISTANT_INGEST_TOKEN>
```

This is separate from:

- Telegram webhook secret auth
- Supabase user session auth

## Assistant Write Paths

- `POST /api/internal/ingest/news`
- `POST /api/internal/ingest/follow-ups`
- `POST /api/internal/ingest/portfolio`
- `POST /api/internal/ingest/tickers`
- `POST /api/internal/ingest/themes`

## Recommended Assistant Sequence

### Before insert

1. Search the relevant scope.
2. If an existing result clearly matches, update instead of insert.
3. If no result matches, insert.

### With the helper file

Changsebot can use:

- `createChangsebotClient(...)`
- `transformNaturalLanguageToAction(...)`

from:

- `src/lib/integrations/changsebot-client.ts`

Suggested sequence:

1. Parse the natural-language request into a draft action.
2. If `missingFields` is not empty, ask a short follow-up question.
3. Run the suggested search first.
4. If an existing row matches, update/delete with the returned `ref`.
5. Otherwise insert a new row.

### Before update/delete

1. Search first.
2. Use the returned `ref` or full `id`.
3. Send that identifier in the ingest payload.

## Example Checks

### Check whether NVDA already exists in portfolio

```json
{
  "scope": "portfolio",
  "query": "NVDA"
}
```

### Check whether META ticker already exists

```json
{
  "scope": "ticker",
  "query": "META"
}
```

### Search a theme

```json
{
  "scope": "theme",
  "query": "반도체"
}
```

### Search a prior news item

```json
{
  "scope": "news",
  "query": "보조금"
}
```
