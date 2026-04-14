# TCG 매입 키오스크

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)
![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)
![License](https://img.shields.io/badge/license-private-red)

---

## 프로젝트 소개

TCG(트레이딩 카드 게임) 카드 매장에서 사용하는 **매입 키오스크 앱**입니다. 고객이 직접 카드를 선택하고 매입 견적을 확인할 수 있으며, 관리자는 PIN 인증 후 매입가 및 카드 정보를 관리합니다. Next.js 정적 빌드 + Electron 패키징으로 Windows 오프라인 환경에서 구동됩니다.

---

## 주요 기능

- 🃏 **카드 그리드 뷰** - 확장팩 탭별로 카드 목록 탐색
- 💰 **레어도별 매입가 설정** - 컴팩트 레어도 피커로 빠른 가격 입력
- 🛒 **장바구니 / 매입 요청 흐름** - 카드 선택 후 매입 요청 제출까지 단계별 UX
- 🔐 **관리자 PIN 인증** - 숫자패드 + 키보드 입력 지원, Electron IPC 연동
- ➕ **카드 추가 / 수정 / 삭제** - 관리자 모드에서 카드 정보 직접 편집
- ⏸️ **카드 관리** - 개별 카드 매입 중지 / 재개 토글
- 📁 **탭 관리** - 확장팩 탭 추가 / 이름 변경 / 삭제
- 💾 **localStorage 영속화** - 페이지 새로고침 후에도 데이터 유지
- 📦 **Electron 데스크탑 앱 패키징** - Windows x64 NSIS 설치 파일 빌드

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (Static Export) |
| UI 라이브러리 | React 19 |
| 스타일링 | Tailwind CSS v4 |
| 컴포넌트 | shadcn/ui (Radix UI 기반) |
| 데스크탑 래핑 | Electron 33 |
| 정적 파일 서빙 | electron-serve |
| 언어 | TypeScript 5.7 |

---

## 화면 구성

```
┌─────────────────────────────────────────────────────┐
│  [확장팩 탭 1] [확장팩 탭 2] [확장팩 탭 3] ...        │  <- 탭 바 (상단)
├─────────────────────────────────────────────────────┤
│                                                     │
│  [카드] [카드] [카드] [카드] [카드]                   │
│  [카드] [카드] [카드] [카드] [카드]  <- 카드 그리드    │
│  [카드] [카드] [카드] [카드] [카드]                   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  장바구니: 3장 선택됨        [매입 요청] [관리자 모드]  │  <- 하단 바
└─────────────────────────────────────────────────────┘
```

- 카드 클릭 시 상세 모달 (이미지, 레어도, 매입가 확인 및 수량 선택)
- 관리자 버튼 클릭 시 PIN 오버레이 표시
- 관리자 모드 진입 후 카드 편집 / 가격 설정 / 탭 관리 패널 노출

---

## 시작하기

### Prerequisites

- Node.js 18+
- pnpm

### 설치

```bash
pnpm install
```

### 개발 서버 (브라우저)

```bash
pnpm dev
```

### Electron 개발 모드 실행

```bash
pnpm electron:dev
```

### Windows .exe 빌드

```bash
pnpm electron:build
```

빌드 결과물은 `dist/` 폴더에 생성됩니다.

---

## 설정 파일

프로젝트 루트 또는 설치된 exe 옆에 위치하는 `config.json`으로 설정을 변경할 수 있습니다.

```json
{
  "adminPin": "1234"
}
```

| 필드 | 설명 | 기본값 |
|------|------|--------|
| `adminPin` | 관리자 PIN (4자리 숫자) | `"1234"` |

> 개발 환경: 프로젝트 루트의 `config.json`을 읽습니다.  
> 프로덕션 (패키징된 exe): exe 파일과 같은 폴더의 `config.json`을 읽습니다.

---

## 프로젝트 구조

```
tcg_trade_kiosk/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   └── page.tsx            # 메인 키오스크 페이지
├── components/
│   ├── pin-auth-overlay.tsx  # 관리자 PIN 인증 UI
│   ├── card-grid.tsx         # 카드 그리드 뷰
│   ├── card-edit-modal.tsx   # 카드 추가/수정 모달
│   └── ui/                   # shadcn/ui 컴포넌트
├── electron/
│   ├── main.js             # Electron 메인 프로세스
│   └── preload.js          # Preload 스크립트 (IPC 브릿지)
├── lib/
│   └── mock-cards.ts       # 초기 카드 데이터 (시드)
├── config.json             # 관리자 설정 (gitignore됨)
├── next.config.mjs         # Next.js 설정 (static export)
└── package.json            # 의존성 및 electron-builder 설정
```

---

## 관리자 접근

1. 키오스크 화면 하단의 **관리자** 버튼을 클릭합니다.
2. PIN 입력 패드에서 4자리 번호를 입력합니다 (키보드 숫자키 지원).
3. 기본 PIN은 **`1234`** 입니다.

PIN 변경 방법:
- `config.json`의 `adminPin` 값을 원하는 4자리 숫자로 수정합니다.
- 앱을 재시작하면 적용됩니다.

```json
{
  "adminPin": "5678"
}
```
