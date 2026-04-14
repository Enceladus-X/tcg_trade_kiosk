# TCG 매입 키오스크

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)
![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)
![Platform](https://img.shields.io/badge/platform-Windows_x64-0078D6?logo=windows)
![License](https://img.shields.io/badge/license-private-red)

---

## 다운로드

**[Releases 페이지](https://github.com/Enceladus-X/tcg_trade_kiosk/releases/latest)** 에서 최신 `.exe` 파일을 받으세요.

별도 설치 없이 더블클릭으로 바로 실행됩니다.

---

## 프로젝트 소개

TCG(트레이딩 카드 게임) 카드 매장용 **매입 키오스크 데스크탑 앱**입니다.

고객이 직접 카드를 검색하고 레어도별 매입가를 확인한 뒤 장바구니에 담아 매입 요청을 제출하면, 관리자가 승인 후 처리합니다. Next.js 정적 빌드 + Electron 포터블 패키징으로 **Windows 오프라인 환경에서 추가 설치 없이 구동**됩니다.

---

## 주요 기능

### 고객 화면
- 🃏 **카드 그리드** - 확장팩 탭별 카드 목록, 실제 카드 이미지 표시
- 🔍 **인라인 검색** - 헤더 내 검색창으로 카드명 실시간 필터링
- 💰 **매입가 확인** - 카드 클릭 시 레어도별 매입가 및 수량 선택 모달
- 🛒 **장바구니** - 여러 카드 담기 후 한 번에 매입 요청 제출

### 관리자 기능 (PIN 인증)
- 🔐 **PIN 인증** - 숫자패드 UI + 키보드 입력 지원, Electron IPC로 안전하게 검증
- ➕ **카드 추가** - 레어도 칩 클릭으로 활성화, 가격 0원이면 자동 비활성화
- ✏️ **카드 수정 / 삭제** - 카드 상세 모달 내 편집 모드 (없는 레어도 추가 가능)
- ⏸️ **매입 중지 / 재개** - 카드 관리 탭에서 썸네일 목록으로 일괄 확인
- 📋 **매입 요청 관리** - 대기중 / 승인 / 지급완료 / 거절 상태 관리
- 📁 **탭 관리** - 확장팩 탭 추가 / 삭제, 탭별 카드 수 표시

### 시스템
- 💾 **localStorage 영속화** - 카드/탭 데이터 새로고침 후에도 유지
- 📦 **포터블 exe** - 설치 불필요, 더블클릭으로 바로 실행 (Windows x64)
- 🔌 **종료 버튼** - 앱 헤더 내 전원 버튼 (Electron 환경에서만 표시)

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (Static Export) |
| UI 라이브러리 | React 19 |
| 스타일링 | Tailwind CSS v4 |
| 컴포넌트 | shadcn/ui (Radix UI) |
| 데스크탑 래핑 | Electron 33 |
| 정적 파일 서빙 | electron-serve |
| 언어 | TypeScript 5.7 |
| 패키지 매니저 | pnpm |

---

## 화면 구성

```
┌──────────────────────────────────────────────────────────────────┐
│  [블레이징 도미니언] [버스트 프로토콜] [...]   [🔍] [⚙️] [⏻]     │  <- 헤더
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [카드] [카드] [카드] [카드] [카드] [카드] [카드] [카드]           │
│  [카드] [카드] [카드] [카드] [카드] [카드] [카드] [카드]  <- 그리드 │
│  [카드] [카드] [카드] [카드] [카드] [카드] [카드] [카드]           │
│                                                                  │
│                                              [🛒 장바구니 버튼]   │  <- 우측 하단
└──────────────────────────────────────────────────────────────────┘

카드 클릭
└─> 레어도 선택 모달 (이미지 + 매입가 + 수량 선택 + 장바구니 추가)

⚙️ 관리자 버튼
└─> PIN 입력
    └─> 관리자 대시보드
        ├── 매입 요청 관리
        ├── 카드 추가
        ├── 카드 관리 (매입 중지/재개)
        └── 탭 관리
```

---

## 설치 및 실행

### 일반 사용자

1. **[Releases](https://github.com/Enceladus-X/tcg_trade_kiosk/releases/latest)** 에서 `.exe` 다운로드
2. 원하는 폴더에 복사
3. exe 더블클릭 → 실행 완료

---

## 설정 파일

exe와 **같은 폴더**에 `config.json`을 두면 관리자 PIN을 변경할 수 있습니다.  
파일이 없으면 앱 최초 실행 시 기본값으로 자동 생성됩니다.

```json
{
  "adminPin": "1234"
}
```

| 필드 | 설명 | 기본값 |
|------|------|--------|
| `adminPin` | 관리자 PIN (4자리 숫자 권장) | `"1234"` |

---

## 프로젝트 구조

```
tcg_trade_kiosk/
├── app/
│   ├── layout.tsx
│   └── page.tsx                  # 메인 페이지 (모달 라우팅, 상태 관리)
├── components/
│   ├── full-width-grid.tsx       # 카드 그리드 + 탭 + 검색 + 종료 버튼
│   ├── card-detail-modal.tsx     # 카드 상세 / 구매 / 편집 모달
│   ├── global-admin-modal.tsx    # 관리자 대시보드 (4탭)
│   ├── cart-list-modal.tsx       # 장바구니 / 매입 요청 제출
│   ├── pin-auth-overlay.tsx      # PIN 인증 UI (Electron IPC 연동)
│   ├── rarity-picker.tsx         # 레어도 칩 선택 컴포넌트
│   └── ui/
│       └── scroll-area.tsx       # Radix UI 스크롤 영역
├── electron/
│   ├── main.js                   # 메인 프로세스 (창 생성, config 읽기, IPC)
│   └── preload.js                # Preload (window.electronAPI 노출)
├── lib/
│   ├── mock-cards.ts             # 초기 카드 데이터 (시드, 유희왕 블레이징 도미니언)
│   ├── use-cards.ts              # 카드/탭 외부 스토어 (localStorage 영속화)
│   ├── use-cart.ts               # 장바구니 스토어
│   └── use-orders.ts             # 매입 요청 스토어
├── public/
│   └── cards/                    # 카드 이미지 (BLZD-KR*.png)
├── build/
│   ├── create-icon.py            # 아이콘 생성 스크립트
│   └── icon.ico                  # 앱 아이콘
├── config.json                   # 관리자 설정 (gitignore, 자동 생성)
├── setup.bat                     # 개발 환경 빌드 자동화
├── next.config.mjs               # Next.js 설정 (output: export)
└── package.json                  # 의존성 + electron-builder 설정
```

---

## 관리자 접근

1. 화면 우측 상단 **⚙️ 설정 버튼** 클릭
2. PIN 4자리 입력 (숫자패드 또는 키보드)
3. 기본 PIN: **`1234`**

PIN 변경 → `config.json`의 `adminPin` 수정 후 앱 재시작

---

## 개발자용 빌드

> 소스에서 직접 빌드할 경우에만 필요합니다.

1. [Node.js LTS](https://nodejs.org) 설치
2. `setup.bat` 더블클릭 (pnpm 설치 → 빌드 → exe 생성 자동화)
