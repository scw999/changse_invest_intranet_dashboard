# 창세인베스트 인트라 시스템

개인용 시장/경제 리서치 운영 대시보드 MVP입니다. 이 앱은 일반 공개 서비스가 아니라, 소유자와 내부 보조 시스템만 접근하는 private research system을 목표로 합니다.

## 현재 단계

- Phase 1 MVP UI 완료
- Supabase 실데이터 조회 연결 완료
- 접근 제어 우선 전환 완료
  - 관리자 이메일 allowlist
  - private sign-in flow
  - 서버 측 trusted read path
  - 내부 assistant ingest route scaffold
  - 브라우저 localStorage 저장 제거
- Phase 2 CRUD는 보안 경계 위에서 이어서 연결 예정

## 핵심 원칙

- 읽기와 쓰기 모두 기본값은 private입니다.
- 관리자 이메일 allowlist에 포함된 사용자만 앱 내부 화면에 접근할 수 있습니다.
- 클라이언트가 Supabase에 직접 쓰지 않습니다.
- 향후 assistant-driven ingestion은 서버 내부 API와 service role key로만 처리합니다.
- Supabase RLS는 owner 기준으로 엄격하게 유지합니다.

## 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Vercel

## 주요 화면

- `대시보드 / Today`
- `아카이브`
- `테마`
- `티커`
- `전망 / 팔로업`
- `뉴스 운영`
- `포트폴리오 / 관심종목`

## 폴더 구조

```text
src/
  app/
    (private)/
    api/
    auth/
  components/
  lib/
  types/
docs/
supabase/
```

상세 설계 메모는 [docs/architecture.md](./docs/architecture.md)에 있습니다.

## 로컬 실행

### 1. 의존성 설치

```powershell
npm.cmd install
```

### 2. 환경 변수 설정

`.env.example`을 `.env.local`로 복사한 뒤 값을 채웁니다.

필수 값:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL_ALLOWLIST=
ASSISTANT_INGEST_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ALLOWED_CHAT_IDS=
```

설명:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 로그인과 브라우저 세션용 anon key
- `SUPABASE_SERVICE_ROLE_KEY`: 서버 전용 trusted read/write 경로용 key
- `ADMIN_EMAIL_ALLOWLIST`: 접근 허용 이메일 목록, 쉼표로 구분
- `ASSISTANT_INGEST_TOKEN`: 향후 내부 assistant ingest API 인증 토큰
- `TELEGRAM_BOT_TOKEN`: 창세봇 Telegram Bot API 토큰
- `TELEGRAM_WEBHOOK_SECRET`: Telegram webhook secret token
- `TELEGRAM_ALLOWED_CHAT_IDS`: 창세봇이 허용할 Telegram chat id 목록

### 3. 개발 서버 실행

```powershell
npm.cmd run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

### 4. 검증

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

## 인증 및 접근 제어

### 로그인 흐름

- 사용자는 `/auth/sign-in`에서 magic link 이메일 로그인을 사용합니다.
- 로그인 후 서버가 세션을 확인합니다.
- allowlist에 없는 이메일은 `/auth/access-denied`로 이동합니다.

### 관리자 접근

- `ADMIN_EMAIL_ALLOWLIST`에 포함된 이메일만 private route에 접근할 수 있습니다.
- `Admin / News Ops` 같은 편집 화면도 같은 방식으로 보호됩니다.

### 서버 측 trusted path

- 실제 리서치 데이터 조회는 `/api/private/research`를 통해 서버에서만 수행합니다.
- 이 route는 인증된 allowlisted admin 세션이 있어야 응답합니다.
- 내부에서는 `SUPABASE_SERVICE_ROLE_KEY`를 사용해 Supabase를 읽습니다.

### assistant ingest 준비 경로

- `/api/internal/ingest/news`
- `Authorization: Bearer <ASSISTANT_INGEST_TOKEN>` 헤더 필요
- 현재는 인증/검증 골격만 준비된 상태이며 실제 DB write는 아직 연결하지 않았습니다.

## Supabase 설정

### 1. 기본 스키마 적용

Supabase SQL Editor에서 아래 파일을 실행합니다.

1. [supabase/schema.sql](./supabase/schema.sql)
2. [supabase/seed.sql](./supabase/seed.sql)

### 2. 기존 프로젝트 하드닝

이전에 public read 정책을 열어둔 프로젝트라면 아래 파일도 추가로 실행해야 합니다.

1. [supabase/private-access-hardening.sql](./supabase/private-access-hardening.sql)

이 파일은 과거의 public read 정책을 제거하고, private-by-default 상태로 되돌립니다.

### 3. 현재 RLS 방향

- owner row만 직접 접근 가능
- public select 없음
- public insert/update/delete 없음
- 클라이언트는 service role key를 볼 수 없음
- 관리자 앱도 trusted server route를 통해서만 데이터에 접근

## 시드 데이터

시드 데이터는 아래 엔티티를 포함합니다.

- `themes`
- `tickers`
- `news_items`
- `news_item_themes`
- `news_item_tickers`
- `follow_up_records`
- `portfolio_items`
- `user_preferences`
- `user_theme_interests`

## Vercel 배포

### 1. 프로젝트 연결

GitHub 저장소를 Vercel 프로젝트에 연결합니다.

### 2. 환경 변수 추가

Vercel Project Settings에서 아래 값을 설정합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAIL_ALLOWLIST
ASSISTANT_INGEST_TOKEN
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`와 `ASSISTANT_INGEST_TOKEN`은 절대 클라이언트 코드로 노출되면 안 됩니다.
- 값 변경 후에는 redeploy가 필요합니다.

### 3. 운영 체크

- sign-in 페이지가 뜨는지 확인
- allowlist 이메일만 진입 가능한지 확인
- 비허용 이메일은 access denied로 이동하는지 확인
- private research API가 로그인 없이 응답하지 않는지 확인

## 다음 Phase 2 범위

보안 경계가 먼저 정리된 상태이므로, 다음 CRUD는 아래 순서로 붙이는 것이 안전합니다.

1. `Admin / News Ops` 서버 action 또는 private API write 연결
2. `Portfolio / Watchlist` write 연결
3. `Follow-up` status update 연결
4. assistant ingest route의 실제 write 연결
5. 감사 로그 또는 변경 이력 보강

현재 반영 완료:

- `Admin / News Ops` private write API
- `Portfolio / Watchlist` private write API
- `internal ingest` routes for `news`, `portfolio`, `tickers`
- `Telegram webhook` route for 창세봇 command ingestion

창세봇 연동용 payload 예시와 권장 구조는 [docs/telegram-assistant-ingest.md](./docs/telegram-assistant-ingest.md)에 정리했습니다.

## 참고

- 현재 브라우저 로컬 저장은 제거되어, 민감한 리서치 데이터가 localStorage에 남지 않습니다.
- mock 데이터 fallback은 개발 편의용이며, private API가 정상 동작하면 Supabase 실데이터가 우선 사용됩니다.
## 2026-03 usability upgrade

- Dashboard stat cards now drill down into filtered archive or follow-up views.
- Slot monitor cards now open `/archive` with URL-driven filters such as `date=today` and `slot=09`.
- News cards now link to `/archive/[id]` detail pages.
- Theme dashboard cards can route into filtered archive views.
- Archive and follow-up pages now read and update filters from the URL query string.

### Markdown rendering

Detail content and long-form note areas now use safe markdown rendering with:

- headings
- bold text
- bullet and numbered lists
- tables
- blockquotes
- preserved line breaks for plain text

Implemented with:

- `react-markdown`
- `remark-gfm`
- `remark-breaks`

Unsafe raw HTML is not enabled.

### Example drill-down routes

- `/archive?type=news&date=today`
- `/archive?type=news&date=today&slot=09`
- `/archive?priority=Critical`
- `/archive?linked=portfolio`
- `/archive?theme=ai-supply-chain`
- `/archive?ticker=NVDA`
- `/follow-up?status=Pending`

## 2026-03 content type upgrade

Research records are no longer treated as only `news`. The archive and ingest flow now support:

- `news`
- `analysis`
- `opinion`
- `monitoring`

### Schema

`news_items` now includes:

- `content_type text not null default 'news'`
- `content_meta jsonb not null default '{}'::jsonb`

Monitoring-specific notes can live under:

```json
{
  "monitoring": {
    "targetTickers": ["NVDA"],
    "note": "Covered-call ETF comparison watch",
    "referencePrice": "129.50",
    "currentSnapshot": "Dividend trend stable",
    "triggerCondition": "Break below 124",
    "nextCheckNote": "Review after next monthly distribution"
  }
}
```

### Migration

Run this if your Supabase project already existed before the content type update:

1. [supabase/content-types-migration.sql](./supabase/content-types-migration.sql)

Existing rows are backfilled to `news`, so old items continue to work without extra edits.

### Internal assistant ingest

`/api/internal/ingest/news` now accepts optional `contentType`.
If omitted, the server defaults it to `news`.

Example payloads:

```json
{
  "operation": "upsert",
  "contentType": "news",
  "title": "NVDA earnings beat consensus",
  "summary": "Datacenter guidance came in ahead of market expectations.",
  "sourceName": "Bloomberg",
  "sourceUrl": "https://example.com",
  "publishedAt": "2026-03-14T09:00:00+09:00",
  "scanSlot": "09",
  "region": "US",
  "affectedAssetClasses": ["Equities", "ETF"],
  "relatedThemeIds": ["theme-ai-supply"],
  "relatedTickerIds": ["ticker-nvda"],
  "marketInterpretation": "Short-term positive for AI leadership.",
  "directionalView": "Bullish",
  "actionIdea": "Hold existing exposure and watch follow-through.",
  "followUpStatus": "Pending",
  "followUpNote": "Check market breadth after the open.",
  "importance": "High"
}
```

```json
{
  "operation": "upsert",
  "contentType": "analysis",
  "title": "JEPQ vs STRC allocation memo",
  "summary": "Comparison of yield stability, downside behavior, and fit in a 5% sleeve.",
  "sourceName": "Changse Bot",
  "sourceUrl": "https://changse.local/analysis/jepq-strc",
  "publishedAt": "2026-03-14T13:00:00+09:00",
  "scanSlot": "13",
  "region": "US",
  "affectedAssetClasses": ["ETF"],
  "relatedThemeIds": ["theme-rates-path"],
  "relatedTickerIds": ["ticker-jepq", "ticker-strc"],
  "marketInterpretation": "Income products should be compared across distribution quality and drawdown behavior.",
  "directionalView": "Neutral",
  "actionIdea": "Use as a comparison note, not a same-day trade trigger.",
  "followUpStatus": "Pending",
  "followUpNote": "Update after the next monthly distribution print.",
  "importance": "Medium"
}
```

```json
{
  "operation": "upsert",
  "contentType": "opinion",
  "title": "5% income sleeve opinion",
  "summary": "Prefer JEPQ 3% plus TIGER US dividend ETF 2% over a full 5% single ETF concentration.",
  "sourceName": "Changse Bot",
  "sourceUrl": "https://changse.local/opinion/income-sleeve",
  "publishedAt": "2026-03-14T18:00:00+09:00",
  "scanSlot": "18",
  "region": "GLOBAL",
  "affectedAssetClasses": ["ETF"],
  "relatedThemeIds": ["theme-safe-havens"],
  "relatedTickerIds": ["ticker-jepq"],
  "marketInterpretation": "Blending products can reduce single-instrument regret risk.",
  "directionalView": "Mixed",
  "actionIdea": "Treat this as portfolio opinion, not factual reporting.",
  "followUpStatus": "Pending",
  "followUpNote": "Revisit after monthly income and price drawdown comparison.",
  "importance": "Medium"
}
```

```json
{
  "operation": "upsert",
  "contentType": "monitoring",
  "title": "NVDA price and dividend watch",
  "summary": "Track drawdown level and next review trigger for AI exposure.",
  "sourceName": "Changse Bot",
  "sourceUrl": "https://changse.local/monitoring/nvda-watch",
  "publishedAt": "2026-03-14T22:00:00+09:00",
  "scanSlot": "22",
  "region": "US",
  "affectedAssetClasses": ["Equities"],
  "relatedThemeIds": ["theme-ai-supply"],
  "relatedTickerIds": ["ticker-nvda"],
  "marketInterpretation": "This is a watch item rather than a factual news report.",
  "directionalView": "Neutral",
  "actionIdea": "Do not act unless the trigger condition is met.",
  "followUpStatus": "Pending",
  "followUpNote": "Check again after the next major move.",
  "importance": "High",
  "monitoring": {
    "targetTickers": ["NVDA"],
    "note": "Watch for drawdown and sentiment reset.",
    "referencePrice": "129.50",
    "currentSnapshot": "Price holding above short-term support.",
    "triggerCondition": "Break below 124 or renewed volume spike",
    "nextCheckNote": "Review after next close"
  }
}
```

### UI behavior

- Dashboard now shows grouped latest sections for `news`, `analysis`, `opinion`, and `monitoring`
- Archive cards and detail pages now display a visible content type badge
- `/archive?type=news|analysis|opinion|monitoring` is supported
- Monitoring detail pages show extra watch-specific fields when present
