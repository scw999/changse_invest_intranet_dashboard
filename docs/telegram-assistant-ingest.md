# Telegram Assistant Ingest

창세인베스트 인트라넷 대시보드는 수기 입력도 가능하지만, 권장 운영 흐름은 아래와 같습니다.

1. 사용자가 텔레그램에서 창세봇에게 요청
2. 창세봇이 요청을 구조화된 명령으로 해석
3. 내부 authenticated ingest API 호출
4. 서버가 `ASSISTANT_INGEST_TOKEN`을 검증하고 Supabase에 저장

## 이 앱에 맞는 입력 범위

창세봇은 아래 4가지를 중심으로 작동하는 것이 가장 자연스럽습니다.

- 뉴스 등록
- 투자 해석 / 액션 아이디어 저장
- 팔로업 상태 업데이트
- 포트폴리오 / 관심종목 / 티커 관리

즉, 일반 일기형 로그보다 `시장 뉴스 -> 해석 -> 액션 -> 사후검증` 흐름이 중심입니다.

## 보안 원칙

- 텔레그램 클라이언트는 직접 Supabase를 호출하지 않습니다.
- 창세봇 서버만 내부 ingest API를 호출합니다.
- 인증은 `Authorization: Bearer <ASSISTANT_INGEST_TOKEN>` 헤더로 수행합니다.
- 실제 DB write는 server-side service role key로만 수행됩니다.

## Telegram Webhook

앱 내부에 Telegram webhook route도 준비되어 있습니다.

- `POST /api/internal/telegram/webhook`
- 헤더: `x-telegram-bot-api-secret-token: <TELEGRAM_WEBHOOK_SECRET>`
- 환경 변수:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_WEBHOOK_SECRET`
  - `TELEGRAM_ALLOWED_CHAT_IDS`

흐름은 다음과 같습니다.

- 텔레그램 메시지
- webhook
- internal ingest API
- Supabase

## 내부 엔드포인트

### 1. 뉴스 / 투자 아이디어

`POST /api/internal/ingest/news`

용도:

- 뉴스 등록
- 기존 뉴스 수정
- 투자 해석과 액션 아이디어 저장
- 뉴스 삭제

업서트 예시:

```json
{
  "operation": "upsert",
  "title": "한국 반도체 수출 데이터 개선",
  "summary": "조기 수출 지표가 메모리 중심으로 개선됐다.",
  "sourceName": "연합",
  "sourceUrl": "https://example.com/news",
  "publishedAt": "2026-03-13T09:00:00+09:00",
  "scanSlot": "09",
  "region": "KR",
  "affectedAssetClasses": ["Equities"],
  "relatedThemeIds": ["theme-semi-cycle"],
  "relatedTickerIds": ["ticker-005930-ks", "ticker-000660-ks"],
  "marketInterpretation": "메모리 사이클 회복 기대를 강화한다.",
  "directionalView": "Bullish",
  "actionIdea": "삼성전자와 SK하이닉스 pullback 매수 관점 유지.",
  "followUpStatus": "Pending",
  "followUpNote": "다음 주 가격 데이터 확인 필요.",
  "importance": "High"
}
```

삭제 예시:

```json
{
  "operation": "delete",
  "id": "news-item-id"
}
```

### 2. 팔로업

`POST /api/internal/ingest/follow-ups`

용도:

- 이전 뉴스 해석이 맞았는지 / 틀렸는지 / 혼합인지 업데이트
- 뉴스의 `follow_up_status`, `follow_up_note`와 연동

예시:

```json
{
  "newsItemId": "news-001",
  "status": "Correct",
  "resultNote": "오전 해석대로 반도체 강세가 이어졌다."
}
```

### 3. 포트폴리오 / 관심종목 / 선호 설정

`POST /api/internal/ingest/portfolio`

자산 업서트 예시:

```json
{
  "operation": "upsert_item",
  "symbol": "NVDA",
  "assetName": "NVIDIA",
  "assetType": "Stock",
  "region": "US",
  "isHolding": false,
  "isWatchlist": true,
  "memo": "AI 공급망 핵심 티커로 watchlist 유지",
  "priority": "High"
}
```

자산 삭제 예시:

```json
{
  "operation": "delete_item",
  "id": "portfolio-item-id"
}
```

선호 설정 업데이트 예시:

```json
{
  "operation": "update_preferences",
  "preferences": {
    "preferredSort": "importance",
    "favoriteSlots": ["09", "18", "22"],
    "defaultRegions": ["KR", "US"],
    "interestThemeIds": ["theme-ai-supply", "theme-rates-path"],
    "compactMode": false
  }
}
```

### 4. 티커

`POST /api/internal/ingest/tickers`

업서트 예시:

```json
{
  "operation": "upsert",
  "symbol": "SOXL",
  "name": "Direxion Daily Semiconductor Bull 3X Shares",
  "exchange": "NYSE Arca",
  "region": "US",
  "assetClass": "ETF",
  "note": "고변동 반도체 레버리지 ETF"
}
```

삭제 예시:

```json
{
  "operation": "delete",
  "id": "ticker-id"
}
```

## Telegram 명령 예시

### 뉴스 / 투자 아이디어 등록

```text
/news
title: 한국 반도체 수출 개선
summary: 조기 수출 지표가 개선됐다.
source: 연합
url: https://example.com/news
published_at: 2026-03-13T09:00:00+09:00
slot: 09
region: KR
asset_classes: Equities
theme_ids: theme-semi-cycle
ticker_ids: ticker-005930-ks,ticker-000660-ks
interpretation: 반도체 수출 회복 기대 강화
view: Bullish
action: 삼성전자와 SK하이닉스 비중 유지
follow_up_note: 다음 주 가격 데이터 확인 필요
importance: High
```

`/idea`도 같은 형식으로 사용할 수 있습니다.

### 팔로업 업데이트

```text
/followup
news_item_id: news-001
status: Correct
note: 오전 해석대로 반도체 강세가 이어짐
```

### 포트폴리오 / 관심종목 저장

```text
/portfolio
symbol: NVDA
asset_name: NVIDIA
asset_type: Stock
region: US
holding: false
watchlist: true
priority: High
memo: AI 공급망 핵심 티커
```

`/watchlist`도 같은 형식으로 사용할 수 있습니다.

### 티커 저장

```text
/ticker
symbol: SOXL
name: Direxion Daily Semiconductor Bull 3X Shares
exchange: NYSE Arca
region: US
asset_class: ETF
note: 반도체 레버리지 ETF
```

## 창세봇 권장 역할

창세봇은 아래 역할에 가장 잘 맞습니다.

- 자연어 요청을 뉴스 / 팔로업 / 포트폴리오 / 티커 작업으로 분류
- 필수 필드가 빠지면 저장 전에 확인 질문
- 뉴스 등록 시 해석과 액션 아이디어까지 구조화
- 저장 후 간단한 결과를 텔레그램으로 다시 응답

## 추천 운영 예시

- "오늘 오전 뉴스로 삼성전자, SK하이닉스 관련 반도체 수출 뉴스 하나 등록해줘"
- "이 뉴스 팔로업은 correct로 바꾸고 메모에 수출 강세 지속이라고 남겨줘"
- "NVDA는 관심종목으로, 메모는 AI capex 체크용이라고 넣어줘"
- "관심 테마에 금리 경로랑 AI 공급망 추가해줘"
- "Hanwha Aerospace를 티커 목록에 추가하고 방산 수주 메모 넣어줘"
