# 창세인베스트 인트라 시스템 MVP 아키텍처

## 1. 정보 구조

### 주요 내비게이션

- `투데이`
  - 가장 최신 날짜 기준 최신 스캔 항목
  - `09 / 13 / 18 / 22` 슬롯 모니터
  - 고확신 핵심 뉴스
  - 최근 팔로업 점검
  - 포트폴리오 연관 뉴스 패널
- `아카이브`
  - 날짜별 탐색
  - 슬롯, 지역, 테마, 티커, 중요도 필터
  - 최신순, 중요도순, 팔로업순, 출처순 정렬
- `테마`
  - 테마 디렉터리
  - 관련 뉴스, 티커, 팔로업을 모아보는 상세 페이지
- `티커`
  - 추적 티커 디렉터리
  - 뉴스와 결과 이력을 묶어보는 상세 페이지
- `전망 / 팔로업`
  - 결과 원장
  - 대기, 적중, 오판, 혼합 필터
- `뉴스 운영`
  - 수기 뉴스 등록
  - 뉴스 수정/삭제
  - 태그 정리와 테마 관리
  - 팔로업 상태 및 메모 갱신
- `포트폴리오 / 관심종목`
  - 보유 자산
  - 관심 종목
  - 관심 테마
  - 개인화와 기본 필터를 위한 사용자 설정

### 핵심 사용자 흐름

1. `뉴스 운영`에서 뉴스 항목을 기록합니다.
2. 관련 테마와 티커를 연결합니다.
3. 시장 해석과 대응 아이디어를 남깁니다.
4. `투데이`와 `아카이브`에서 다시 검토합니다.
5. `전망 / 팔로업`에서 결과 상태를 갱신합니다.
6. `포트폴리오 / 관심종목` 입력을 바탕으로 관련 뉴스 우선순위를 높입니다.

## 2. 데이터베이스 스키마

### 주요 테이블

- `themes`
  - 리서치 분류 체계
- `tickers`
  - 추적 대상 종목과 자산
- `news_items`
  - 해석과 팔로업 스냅샷을 포함한 핵심 뉴스 레코드
- `news_item_themes`
  - 뉴스와 테마의 다대다 연결
- `news_item_tickers`
  - 뉴스와 티커의 다대다 연결
- `follow_up_records`
  - 과거 해석 결과 기록
- `portfolio_items`
  - 보유 자산과 관심 종목을 함께 저장
- `user_preferences`
  - 기본 정렬, 선호 슬롯, 선호 지역, 컴팩트 모드
- `user_theme_interests`
  - 테마 단위 개인화 입력

### 모델링 원칙

- MVP는 의도적으로 `퀀트 우선`이 아니라 `리서치 운영 우선`입니다.
- `news_items`는 UI에서 즉시 필요한 스냅샷 필드를 함께 보관합니다.
- `follow_up_records`는 해석이 시간이 지나며 어떻게 검증됐는지 별도 이력을 남깁니다.
- `portfolio_items`는 보유와 관심 상태를 한 테이블에 넣어 개인화 로직을 단순하게 유지합니다.
- `owner_id`는 Supabase RLS와 향후 사용자별 분리를 위해 포함합니다.

## 3. 폴더 구조

```text
src/
  app/
    archive/
    admin/
    follow-up/
    portfolio/
    themes/
    tickers/
    globals.css
    layout.tsx
    page.tsx
  components/
    layout/
    pages/
    research/
    ui/
  lib/
    store/
    supabase/
    mock-data.ts
    selectors.ts
    utils.ts
  types/
    research.ts
docs/
  architecture.md
supabase/
  schema.sql
  seed.sql
```

### 이 구조를 선택한 이유

- `app/`은 라우트 중심으로 유지합니다.
- `components/pages/`는 페이지 단위 조합 로직을 담습니다.
- `components/research/`는 도메인 카드와 재사용 UI를 담습니다.
- `lib/store/`는 1단계용 브라우저 저장 스토어를 담습니다.
- `lib/supabase/`는 2단계 백엔드 연결 진입점입니다.
- `supabase/`는 배포 가능한 SQL 자산을 명시적으로 관리합니다.
