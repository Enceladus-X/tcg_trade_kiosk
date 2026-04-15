# TCG Trade Kiosk - 핸드오버 문서

최종 업데이트: 2026-04-15

---

## 프로젝트 개요

유희왕 싱글카드 매입 키오스크. Electron + Next.js(static export) 기반 Windows 포터블 앱.
멀티 PC 실시간 동기화를 위해 Supabase(BaaS)로 마이그레이션 완료.

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (static export) + React 19 |
| 데스크톱 래퍼 | Electron 33 (Windows portable .exe) |
| UI | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| 언어 | TypeScript 5.7 |
| 패키지 매니저 | pnpm 10 |
| 백엔드 | Supabase (PostgreSQL + Storage + Realtime) |
| 서버 상태 관리 | TanStack Query (React Query) v5 |

---

## 환경 설정

### .env.local (프로젝트 루트, git 제외)
```
NEXT_PUBLIC_SUPABASE_URL=https://ramfspcoxshnrxnvqkio.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 개발 서버
```bash
pnpm dev
```

### Electron 빌드
```bash
pnpm electron:build
```

---

## Supabase 구성

### 데이터베이스 테이블

| 테이블 | 용도 |
|---|---|
| `tabs` | 카테고리 탭 (확장팩명) |
| `cards` | 카드 정보. `prices`, `enabled_rarities`는 JSONB |
| `orders` | 주문 헤더 |
| `order_items` | 주문 항목 (orders와 1:N, ON DELETE CASCADE) |

스키마 SQL: `_scripts/supabase_schema.sql`

### Storage

- 버킷: `card-images` (Public)
- 경로: `cards/{CARD_CODE}.png`
- 업로드 정책: anon INSERT/UPDATE 허용

### Realtime

`providers.tsx`의 `<RealtimeSubscriptions />` 컴포넌트가 앱 마운트 시 한 번만 구독.
cards / tabs / orders 테이블 변경 시 TanStack Query 캐시 자동 무효화.

---

## 아키텍처

```
app/
  layout.tsx          - <Providers> 적용
  providers.tsx       - QueryClientProvider + Realtime 구독 (단일 마운트)
  page.tsx            - POSPage 루트

lib/
  supabase.ts         - Supabase 클라이언트 (싱글톤)
  query-client.ts     - TanStack Query 클라이언트 (staleTime 30s)
  database.types.ts   - Supabase DB 행 타입 (snake_case)
  use-cards.ts        - useCards() / useTabs() (Supabase + TanStack Query)
  use-orders.ts       - useOrders() (Supabase + TanStack Query)
  use-cart.ts         - 장바구니 (클라이언트 로컬, 동기화 불필요)
  use-image-upload.ts - Supabase Storage 업로드 훅
  mock-cards.ts       - 타입 정의 + 초기 카드 데이터 (마이그레이션 소스)

components/
  full-width-grid.tsx     - 카드 그리드 (최고가 정렬, 레어도별 가격 오버레이)
  card-detail-modal.tsx   - 카드 상세 / 편집
  global-admin-modal.tsx  - 관리자 대시보드 (주문/카드/탭 관리)
  image-upload-field.tsx  - 이미지 업로드 UI 컴포넌트

_scripts/
  supabase_schema.sql  - DB 초기화 SQL (Supabase 대시보드에서 1회 실행)
  migrate.ts           - 초기 데이터 일괄 마이그레이션 (1회용)
  remap-images.ts      - 이미지-카드 코드 재매핑 (정렬 오류 수정용)
```

---

## 데이터 흐름

```
고객:
  카드 그리드 → 카드 클릭 → 레어도/수량 선택 → 장바구니 → 결제 정보 입력
  → useOrders.createOrder() → Supabase orders + order_items INSERT
  → Realtime → 관리자 화면 즉시 반영

관리자 (PIN 인증 후):
  주문 관리: 상태 변경 (대기 → 승인 → 지급완료)
  카드 관리: 가격 수정, 레어도 토글, 매입 중지
  탭 관리:   확장팩 추가/삭제
  카드 추가: 이미지 파일 선택 → Supabase Storage → DB image_url 저장
```

---

## 카드 그리드 UI

- **정렬**: 활성 매입가 최고가 기준 내림차순 (매입 중지 카드 자동 후순위)
- **가격 오버레이**: 카드 우측 하단 고정, 비싼 순서로 위에 배치
- **레어도별 색상**:

| 레어도 | 뱃지 | 가격 텍스트 |
|---|---|---|
| N | 회색 | 연회색 |
| R | 파랑 | 하늘 |
| SR | 황금 | 노랑 |
| UR | 빨강 | 분홍 |
| UL | 보라 | 연보라 |
| SE | 에메랄드 | 민트 |
| PSR | 하늘 | 스카이블루 |

---

## 마이그레이션 이력

### 초기 마이그레이션 (1회 완료)
```bash
pnpm dlx tsx _scripts/migrate.ts
```
mock-cards.ts → Supabase tabs + cards INSERT.
이미지: `card_images/sheet1_AX_imageY.png` → Storage `cards/{CODE}.png`.

### 이미지 재매핑 (정렬 오류 수정)
```bash
pnpm dlx tsx _scripts/remap-images.ts
```
스프레드시트 행 순서(코드 오름차순 A2~A25)에 맞춰 이미지-카드 코드 재매핑.
`card_images/` 폴더는 git 제외 (.gitignore에 추가됨).

---

## 남은 작업

- [ ] Supabase RLS 정책 강화 (현재 anon 전체 허용 - 프로토타입 수준)
- [ ] 관리자 PIN 인증을 Supabase Auth로 교체 (현재 로컬 config.json 방식)
- [ ] 버스트 프로토콜 등 추가 확장팩 카드 데이터 입력
- [ ] Electron 빌드 후 NEXT_PUBLIC_ 환경변수 번들 포함 여부 검증
- [ ] 주문 내역 날짜 범위 필터 / CSV 내보내기
