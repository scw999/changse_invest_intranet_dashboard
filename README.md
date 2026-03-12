# 창세인베스트 인트라 시스템

일반 뉴스 사이트가 아니라, 시장 뉴스와 해석 메모를 구조적으로 쌓아가는 개인 리서치 운영 대시보드 MVP입니다.

## 포함 내용

- Next.js App Router + TypeScript + Tailwind CSS
- 모바일 대응 프리미엄 리서치 대시보드 UI
- 실행 즉시 동작하는 시드 목데이터
- 브라우저 저장 기반 MVP CRUD
  - 뉴스 항목
  - 테마/태그
  - 팔로업 업데이트
  - 포트폴리오/관심종목 입력
- 2단계를 위한 Supabase 스키마와 시드 SQL
- Vercel 배포 준비 구조

## 제품 범위

이 MVP는 의도적으로 아래 범위에 집중합니다.

1. 뉴스 관리
2. 태그 정리
3. 팔로업 업데이트
4. 날짜·테마·티커·슬롯 기준 아카이브 탐색
5. 포트폴리오와 관심종목 입력
6. 가벼운 연관도 신호

아직 깊게 구현하지 않은 영역:

- 리밸런싱 보조
- 고도화된 방향성 예측
- 커뮤니티/심리 분석 모듈
- 퀀트 또는 시뮬레이션 시스템

## 정보 구조

주요 메뉴:

- `투데이`
- `아카이브`
- `테마`
- `티커`
- `전망 / 팔로업`
- `뉴스 운영`
- `포트폴리오 / 관심종목`

상세 아키텍처 메모는 [docs/architecture.md](./docs/architecture.md)에 정리했습니다.

## 폴더 구조

```text
src/
  app/
  components/
  lib/
  types/
docs/
supabase/
```

[docs/architecture.md](./docs/architecture.md)에서 라우트, 컴포넌트, 데이터 레이어 구성을 더 자세히 볼 수 있습니다.

## 로컬 실행

### 1. 의존성 설치

```bash
npm install
```

PowerShell에서 실행 정책 오류가 나오면 아래처럼 실행하세요.

```powershell
npm.cmd install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

PowerShell이라면 아래 명령도 가능합니다.

```powershell
npm.cmd run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 됩니다.

### 3. 품질 점검

```bash
npm run lint
npm run typecheck
npm run build
```

## 현재 데이터 동작 방식

- UI는 [`src/lib/mock-data.ts`](./src/lib/mock-data.ts)의 시드 목데이터로 바로 동작합니다.
- 런타임 변경사항은 Zustand 기반 브라우저 저장소에 유지됩니다.
- 그래서 Supabase 연결 전에도 바로 사용 가능합니다.

## Supabase 설정

### 1. Supabase 프로젝트 생성

[Supabase](https://supabase.com/)에서 새 프로젝트를 만듭니다.

### 2. 환경 변수 추가

`.env.example`을 `.env.local`로 복사한 뒤 아래 값을 채웁니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

현재 기준 메모:

- 1단계 UI는 Supabase 없이도 실행됩니다.
- 이 환경 변수는 2단계 전환과 Vercel 배포 준비용입니다.

### 3. 스키마 적용

Supabase SQL Editor에서 [`supabase/schema.sql`](./supabase/schema.sql)을 실행합니다.

생성되는 주요 테이블:

- themes
- tickers
- news_items
- follow_up_records
- portfolio_items
- user_preferences
- join tables
- RLS policies

### 4. Supabase 시드 입력

스키마 적용 후 [`supabase/seed.sql`](./supabase/seed.sql)을 실행합니다.

중요:

- `seed.sql`은 초기 MVP 시딩을 쉽게 하기 위해 데모 `owner_id` UUID를 사용합니다.
- 나중에 실제 인증 사용자와 연결하려면 해당 UUID를 바꿔야 합니다.

## 시드 데이터 안내

시드 경로는 두 가지입니다.

### 앱 기본 시드

별도 작업이 필요 없습니다. 앱이 현실감 있는 목데이터와 함께 바로 실행됩니다.

### Supabase SQL 시드

1. [`supabase/schema.sql`](./supabase/schema.sql)을 적용합니다.
2. [`supabase/seed.sql`](./supabase/seed.sql)을 적용합니다.
3. 2단계에서 로컬 MVP 스토어 대신 Supabase 읽기/쓰기 로직을 연결합니다.

## Vercel 배포

### 1. Git 저장소에 푸시

GitHub, GitLab, Bitbucket 중 하나에 올리면 가장 매끄럽게 배포할 수 있습니다.

### 2. Vercel에 프로젝트 가져오기

Vercel에서 새 프로젝트를 만들고 이 저장소를 선택합니다.

### 3. 환경 변수 설정

Vercel Project Settings에 아래 값을 추가합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 4. 배포

Vercel이 Next.js를 자동으로 감지하므로 기본 설정으로 배포해도 충분합니다.

## 구현 단계

### 1단계

- 아키텍처와 페이지 구조
- 목데이터
- 다듬어진 UI
- 필터와 아카이브 흐름
- 뉴스 운영 폼
- 포트폴리오/관심종목 입력

### 2단계

- 실제 Supabase 연동
- 인증 기반 CRUD
- 서버 영속 데이터

### 3단계

- 보유 자산, 관심종목, 관심 테마 기반의 가벼운 개인화

## 다음 개발 메모

- 현재 [`src/lib/store/research-store.ts`](./src/lib/store/research-store.ts) 구조는 관계형 스키마와 거의 동일하게 맞춰져 있습니다.
- 로컬 스토어를 Supabase fetch/mutation으로 바꾸는 작업은 페이지 단위로 점진적으로 진행할 수 있습니다.
- SQL 스키마는 MVP를 과하게 키우지 않으면서도 이후 확장 여지를 남겨두었습니다.
