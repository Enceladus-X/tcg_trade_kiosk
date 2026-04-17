# 마린포드 싱글카드 매입 키오스크

![version](https://img.shields.io/badge/version-v0.4.1-amber)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![Platform](https://img.shields.io/badge/platform-Windows_x64-0078D6?logo=windows)
![License](https://img.shields.io/badge/license-private-red)

---

## 다운로드

**[Releases 페이지](https://github.com/Enceladus-X/tcg_trade_kiosk/releases/latest)** 에서 최신 `MarinfordKiosk_v*.exe` 파일을 받으세요.

별도 설치 없이 더블클릭으로 바로 실행됩니다. 인터넷 연결 필요 (Supabase 클라우드 연동).

---

## 프로젝트 소개

TCG(트레이딩 카드 게임) 카드 매장 **마린포드**의 싱글카드 매입 업무 자동화를 위한 키오스크 데스크탑 앱입니다.

고객이 직접 카드를 조회하고 레어도별 매입가를 확인한 뒤 요청을 제출하면, 직원이 관리자 화면에서 승인 후 입금 처리합니다. Supabase Realtime으로 여러 기기 간 데이터가 실시간 동기화됩니다.

---

## 화면 구성

```
┌─────────────────────────────────────────────────────────────────────┐
│        마린포드 유희왕 매입표          │  [유희왕 로고] [원피스 로고]  │
│  ┌──────────────────┐  [전체] [N] [R] [SR] ...                      │
│  │ 블레이징 도미니언 v │                                              │
│  └──────────────────┘                                               │
├─────────────────────────────────────────────────────────────────────┤
│  [카드] [카드] [카드] [카드] [카드] [카드]                            │
│  [카드] [카드] [카드] [카드] [카드] [카드]                            │
│  [카드] [카드] [카드] [카드] [카드] [카드]                            │
│                                                            [🔍]     │
│  [⚙️]                                                      [🛒]     │
└─────────────────────────────────────────────────────────────────────┘

카드 클릭  → 레어도 선택 + 수량 선택 모달 → 장바구니 담기 (플라이 애니메이션)
🛒 클릭   → 장바구니 확인 → 현금/마일리지 선택 → 고객 정보 입력 → 매입 요청 제출
⚙️ 클릭   → PIN 입력 → 관리자 대시보드
🔍 클릭   → 카드명/코드 실시간 검색
```

---

## 주요 기능

### 고객 화면

| 기능 | 설명 |
|------|------|
| 게임 선택 | 우측 상단 대형 카드 버튼으로 유희왕/원피스 등 게임 대분류 전환 |
| 탭 드롭다운 | 확장팩별 탭 선택, "전체" 선택 시 해당 게임 모든 카드 표시 |
| 레어도 필터 | 현재 탭에 실제로 존재하는 레어도만 버튼 표시 |
| 카드 검색 | 우하단 🔍 버튼 → 카드명/코드 실시간 필터 |
| 매입가 확인 | 카드 클릭 → 레어도별 매입가 + 수량 선택 모달 |
| 장바구니 | 여러 카드 담기, 합계 표시, 담기 시 플라이 애니메이션 |
| 결제 방식 | 현금 / 마일리지 (보너스 비율 자동 적용) |
| 매입 요청 제출 | 이름 / 은행 / 계좌번호 / 전화번호 입력 (마일리지 시 계좌 생략) |
| 매입 중지 표시 | 해당 카드 그레이아웃 + "매입 중지" 배지 |

### 관리자 화면 (좌하단 ⚙️ → PIN 인증)

| 탭 | 기능 |
|----|------|
| 매입 요청 | 대기/승인/지급완료/거절 상태 처리, 고객정보 원클릭 복사 |
| 카드 추가 | 코드/이름/카테고리 + 레어도 칩으로 가격 설정, 이미지 업로드 |
| 카드 관리 | 탭 추가/삭제, 매입 중지/재개, 카드 수정/삭제 |
| 설정 | 관리자 비밀번호 변경, 마일리지 비율, 레어도 추가/삭제 |
| 게임 | 게임 대분류 추가/삭제/이미지 설정, 탭-게임 연결 |

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| UI 프레임워크 | Next.js 16 (Static Export) |
| 스타일링 | Tailwind CSS v4 |
| 애니메이션 | Framer Motion v12 |
| 서버 상태 | TanStack Query v5 |
| 데이터베이스 | Supabase (PostgreSQL + Storage + Realtime) |
| 데스크탑 래핑 | Electron 33 |
| 언어 | TypeScript 5.7 |
| 패키지 매니저 | pnpm |
| 배포 | electron-builder portable (단일 exe, 무설치) |

---

## 프로젝트 구조

```
tcg_trade_kiosk/
├── app/
│   ├── page.tsx                  - 메인 페이지 (모달 라우팅, 플로팅 버튼)
│   └── providers.tsx             - QueryClient + Realtime 구독
├── components/
│   ├── full-width-grid.tsx       - 게임 버튼, 탭 드롭다운, 카드 그리드, 레어도 필터
│   ├── card-detail-modal.tsx     - 카드 상세 / 편집 / 삭제 / 장바구니 담기
│   ├── global-admin-modal.tsx    - 관리자 대시보드 (5탭)
│   ├── cart-list-modal.tsx       - 장바구니 + 매입 요청 제출
│   ├── pin-auth-overlay.tsx      - PIN 인증
│   ├── rarity-picker.tsx         - 레어도 칩 선택 공용 컴포넌트
│   └── image-upload-field.tsx    - Supabase Storage 이미지 업로드
├── electron/
│   ├── main.js                   - 메인 프로세스
│   └── preload.js                - window.electronAPI 브릿지
├── lib/
│   ├── supabase.ts               - Supabase 클라이언트
│   ├── database.types.ts         - DB 타입 정의
│   ├── mock-cards.ts             - 카드 타입 + 레어도 컬러 시스템
│   ├── use-cards.ts              - 카드/탭 훅
│   ├── use-games.ts              - 게임 대분류 훅
│   ├── use-orders.ts             - 매입 요청 훅
│   ├── use-settings.ts           - 스토어 설정 훅
│   ├── use-cart.ts               - 장바구니 훅 (Zustand)
│   └── use-image-upload.ts       - Storage 업로드 훅
├── public/cards/                 - 카드 이미지 PNG
├── setup.bat                     - 빌드 자동화 배치파일
└── package.json
```

---

## 설치 및 실행

### 일반 사용자 (매장 PC)

1. **[Releases](https://github.com/Enceladus-X/tcg_trade_kiosk/releases/latest)** 에서 `MarinfordKiosk_v*.exe` 다운로드
2. 원하는 폴더에 복사
3. 더블클릭 → 실행

### 소스 빌드

1. [Node.js LTS](https://nodejs.org) 설치
2. `.env.local` 에 Supabase 키 입력
3. `setup.bat` 실행 → `dist/MarinfordKiosk_v*.exe` 생성

---

## Supabase 설정 (최초 1회)

관리자 PIN 및 설정은 Supabase `store_settings` 테이블(id=1)에서 관리합니다.

```sql
-- 게임 이미지 컬럼 (최초 설정 시)
ALTER TABLE games ADD COLUMN IF NOT EXISTS image_url TEXT;
```

Storage 버킷 2개 필요 (Public):
- `card-images` — 카드 이미지
- `game-images` — 게임 로고 이미지
