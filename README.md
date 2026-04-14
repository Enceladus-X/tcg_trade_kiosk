# TCG 매입 키오스크

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)
![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)
![Platform](https://img.shields.io/badge/platform-Windows_x64-0078D6?logo=windows)
![License](https://img.shields.io/badge/license-private-red)

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

## 시작하기

---

### 새 환경에 설치하기 (납품 / 빌드용 PC)

> **최종 사용자 PC (매장 키오스크)에는 별도 설치가 필요 없습니다.**  
> 아래 과정은 `.exe`를 직접 빌드해야 하는 개발자/납품자용입니다.

#### Step 1 — Node.js 설치

1. https://nodejs.org 에 접속
2. **LTS** 버전 다운로드 (v20 이상 권장)
3. 설치 파일 실행 → 기본값으로 설치 완료

설치 확인:
```
node --version   # v20.x.x 이상이면 OK
```

#### Step 2 — setup.bat 실행

프로젝트 폴더에서 `setup.bat`을 더블클릭합니다.

```
1. pnpm 자동 설치 (corepack 또는 npm 경유)
2. 의존성 설치 (pnpm install)
3. Next.js 정적 빌드 (pnpm build)
4. Electron 패키징 (electron-builder)
5. 루트 폴더에 .exe 복사
```

완료 후 같은 폴더의 `.exe` 파일을 실행하면 바로 동작합니다.

> **네트워크 오류 시** (Electron 바이너리 다운로드 실패):  
> 명령 프롬프트에서 아래를 먼저 실행 후 `setup.bat` 재실행  
> ```
> set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
> ```

---

### 개발 환경

#### 요구사항

- Node.js 18+
- pnpm (`npm install -g pnpm` 또는 `corepack enable pnpm`)

#### 설치

```bash
pnpm install
```

#### 개발 서버

```bash
pnpm dev
# http://localhost:3000 에서 브라우저로 확인
```

#### Windows exe 빌드

```bash
pnpm electron:build
# dist/TCG 매입 키오스크 0.1.0.exe 생성
```

> 빌드 결과물은 `dist/` 폴더에 생성됩니다.  
> 포터블 exe이므로 배포 시 단일 파일만 전달하면 됩니다.

---

## 설정 파일

exe와 **같은 폴더**에 `config.json`을 두면 관리자 설정을 변경할 수 있습니다.  
파일이 없으면 앱 최초 실행 시 기본값으로 자동 생성됩니다.

```json
{
  "adminPin": "1234"
}
```

| 필드 | 설명 | 기본값 |
|------|------|--------|
| `adminPin` | 관리자 PIN (4자리 숫자 권장) | `"1234"` |

> **개발 환경**: 프로젝트 루트의 `config.json`을 읽습니다.  
> **프로덕션**: exe 파일과 같은 폴더의 `config.json`을 읽습니다.

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
├── config.json                   # 관리자 설정 (gitignore, 자동 생성)
├── next.config.mjs               # Next.js 설정 (output: export)
└── package.json                  # 의존성 + electron-builder 설정
```

---

## 관리자 접근

1. 화면 우측 상단 **⚙️ 설정 버튼** 클릭
2. PIN 4자리 입력 (숫자패드 또는 키보드)
3. 기본 PIN: **`1234`**

PIN 변경:

```json
// config.json
{
  "adminPin": "5678"
}
```

앱 재시작 후 적용됩니다.

---

## 배포

1. `pnpm electron:build` 실행
2. `dist/TCG 매입 키오스크 0.1.0.exe` 를 대상 PC에 복사
3. exe와 같은 폴더에 `config.json` 배치 (없으면 자동 생성)
4. exe 더블클릭으로 실행 — 추가 설치 불필요
