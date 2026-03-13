# 창세봇 연동 가이드

창세봇은 자연어를 직접 DB에 쓰지 말고, 아래 원칙으로 이 앱의 internal ingest API를 호출하면 됩니다.

## 기본 원칙

- 텔레그램 자연어 해석은 창세봇이 담당
- 이 앱은 구조화된 payload를 검증, 정규화, 저장
- 모든 write는 `Authorization: Bearer <ASSISTANT_INGEST_TOKEN>` 헤더와 함께 호출
- 브라우저나 공개 클라이언트에서 직접 write하지 않음

## 호출 대상

- 뉴스 / 투자 아이디어: `POST /api/internal/ingest/news`
- 팔로업: `POST /api/internal/ingest/follow-ups`
- 포트폴리오 / 관심종목 / 선호 설정: `POST /api/internal/ingest/portfolio`
- 티커: `POST /api/internal/ingest/tickers`
- 테마: `POST /api/internal/ingest/themes`

기준 운영 URL:

- `https://changse-invest-intranet-dashboard.vercel.app`

## 서버가 자동으로 정규화해주는 값

- 지역: `한국`, `국내` -> `KR`, `미국` -> `US`, `글로벌` -> `GLOBAL`
- 슬롯: `아침`, `오전` -> `09`, `점심` -> `13`, `저녁` -> `18`, `밤` -> `22`
- 방향성: `강세` -> `Bullish`, `약세` -> `Bearish`, `중립` -> `Neutral`
- 팔로업 상태: `적중` -> `Correct`, `오판` -> `Wrong`, `대기` -> `Pending`
- 중요도 / 우선순위: `높음` -> `High`, `보통` -> `Medium`, `낮음` -> `Low`
- 일부 티커 별칭: `삼전` -> `005930.KS`, `하이닉스` -> `000660.KS`, `엔비디아` -> `NVDA`

## 창세봇에게 줄 설명 문구

```text
너는 창세인베스트 인트라 시스템에 데이터를 넣는 trusted assistant다.
자연어 요청을 곧바로 저장하지 말고, 먼저 의도를 뉴스/팔로업/포트폴리오/티커/테마 중 하나로 분류한다.
필수 필드가 비어 있으면 저장 전에 사용자에게 짧게 다시 물어본다.
저장 시에는 반드시 구조화된 JSON payload를 만들어 internal ingest API로 보낸다.
브라우저나 공개 클라이언트에서 직접 DB를 건드리지 않는다.
가능하면 한국어 값을 유지해도 되며, 서버가 지역/슬롯/상태/중요도/일부 티커 별칭을 자동 정규화한다.
수정이나 삭제가 필요하면 먼저 검색해서 받은 ref 또는 id를 사용한다.
```

## 권장 payload 예시

### 뉴스

```json
{
  "operation": "upsert",
  "title": "삼성전자 반도체 보조금 수혜 기대",
  "summary": "정부의 반도체 지원 정책 기대가 대형 메모리 업체 투자심리를 자극했다.",
  "sourceName": "연합뉴스",
  "sourceUrl": "https://example.com/news",
  "publishedAt": "2026-03-13T09:00:00+09:00",
  "scanSlot": "아침",
  "region": "한국",
  "affectedAssetClasses": ["주식"],
  "relatedThemeIds": ["반도체", "정책 수혜"],
  "relatedTickerIds": ["삼전", "하이닉스"],
  "marketInterpretation": "국내 반도체 주도주의 정책 프리미엄이 재평가될 수 있다.",
  "directionalView": "강세",
  "actionIdea": "삼성전자와 SK하이닉스 눌림 구간 분할 관찰.",
  "followUpStatus": "대기",
  "followUpNote": "다음 거래일 수급과 외국인 매수 지속 여부 확인.",
  "importance": "높음"
}
```

### 팔로업

```json
{
  "newsItemId": "a1b2c3d4",
  "status": "적중",
  "resultNote": "장중 외국인 순매수 확대로 해석이 맞았다."
}
```

### 포트폴리오

```json
{
  "operation": "upsert_item",
  "symbol": "엔비디아",
  "assetName": "NVIDIA",
  "assetType": "주식",
  "region": "미국",
  "isHolding": false,
  "isWatchlist": true,
  "priority": "높음",
  "memo": "AI 인프라 capex 점검용 핵심 종목"
}
```

### 티커

```json
{
  "operation": "upsert",
  "symbol": "삼전",
  "name": "Samsung Electronics",
  "exchange": "KRX",
  "region": "한국",
  "assetClass": "주식",
  "note": "국내 반도체 대표 대형주"
}
```

### 테마

```json
{
  "operation": "upsert",
  "name": "반도체 정책 수혜",
  "description": "정부 지원과 메모리 업황 회복의 교집합 테마",
  "category": "정책",
  "priority": "높음",
  "color": "#0F766E"
}
```
