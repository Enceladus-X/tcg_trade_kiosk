# TCG 매입 키오스크 - 인수인계 문서

> 작성일: 2026-04-14  
> 프로젝트: 마린포드 싱글카드 매매 키오스크  
> 납품 형태: Windows 포터블 exe (무설치)

---

## 1. 프로젝트 개요

### 배경 및 목적

TCG(트레이딩 카드 게임) 카드 매장 **마린포드**에서 운영하는 싱글카드 매입 업무를 자동화하기 위한 키오스크 소프트웨어입니다.

기존에는 직원이 직접 카드를 보고 가격을 안내하던 방식에서, 고객이 직접 카드를 조회하고 매입 요청을 제출하는 셀프 서비스 방식으로 전환합니다.

### 운영 시나리오

```
고객 도착
  └─> 키오스크 화면에서 카드 검색 또는 탭별 탐색
      └─> 카드 클릭 -> 레어도/매입가 확인 -> 장바구니 담기
          └─> 장바구니에서 이름/계좌 입력 후 매입 요청 제출
              └─> 직원이 관리자 대시보드에서 요청 확인 -> 승인 -> 계좌 입금
```

---

## 2. 기획서

### 핵심 기능 목록

| 기능 | 대상 | 설명 |
|------|------|------|
| 카드 목록 조회 | 고객 | 확장팩 탭별 카드 그리드, 이미지 표시 |
| 카드 검색 | 고객 | 카드명/코드 실시간 필터 |
| 매입가 확인 | 고객 | 레어도별 매입가 모달 |
| 장바구니 | 고객 | 다수 카드 수량별 담기 |
| 매입 요청 제출 | 고객 | 이름/은행/계좌/전화번호 뒤 4자리 입력 |
| 매입 요청 관리 | 관리자 | 대기/승인/지급/거절 상태 처리 |
| 카드 추가 | 관리자 | 새 카드 등록, 레어도별 가격 설정 |
| 카드 수정/삭제 | 관리자 | 가격 변경, 레어도 추가/삭제, 카드 삭제 |
| 매입 중지/재개 | 관리자 | 특정 카드 매입 일시 중단 (그레이아웃 표시) |
| 탭 관리 | 관리자 | 확장팩 탭 추가/삭제 |
| PIN 인증 | 관리자 | 4자리 PIN으로 관리자 화면 잠금 |

### 데이터 흐름

```
초기 데이터: lib/mock-cards.ts (시드 데이터)
      |
      v
앱 시작 시: localStorage 로드 (tcg_kiosk_cards, tcg_kiosk_tabs)
      |
      v
런타임: useSyncExternalStore 기반 in-memory store
      |
      v
변경 시마다: localStorage 자동 저장 (영속화)
```

> **주의**: 매입 요청(주문) 데이터는 현재 in-memory 전용입니다.  
> 앱 재시작 시 초기화됩니다. 영속화가 필요하면 localStorage 또는 로컬 DB 추가 필요.

### 화면 구성

| 화면 | 파일 | 비고 |
|------|------|------|
| 메인 (카드 그리드) | `components/full-width-grid.tsx` | 탭, 검색, 종료 버튼 포함 |
| 카드 상세 모달 | `components/card-detail-modal.tsx` | 구매/편집/삭제 통합 |
| 장바구니 모달 | `components/cart-list-modal.tsx` | 요청 제출 폼 포함 |
| 관리자 대시보드 | `components/global-admin-modal.tsx` | 4탭 구성 |
| PIN 입력 | `components/pin-auth-overlay.tsx` | 숫자패드 + 키보드 |
| 레어도 선택기 | `components/rarity-picker.tsx` | 카드 추가/수정 공용 |

---

## 3. 기술 구조

### 스택

| 계층 | 기술 | 이유 |
|------|------|------|
| UI 프레임워크 | Next.js 16 (Static Export) | React 기반, Electron과 궁합 좋음 |
| 스타일링 | Tailwind CSS v4 | 빠른 개발, 다크 테마 |
| 컴포넌트 | Radix UI (shadcn/ui) | 접근성 보장, 커스텀 용이 |
| 데스크탑 래핑 | Electron 33 | Windows 네이티브 창, 오프라인 동작 |
| 파일 서빙 | electron-serve | 정적 파일을 file:// 없이 서빙 |
| 패키지 관리 | pnpm | 빠른 설치, node_modules 최적화 |
| 언어 | TypeScript 5.7 | 타입 안정성 |

### Electron 구조

```
electron/
├── main.js       - 메인 프로세스
│                   - workArea 기반 창 크기 (작업표시줄 보임)
│                   - frame: false (테두리 없는 창)
│                   - config.json 읽기 (adminPin)
│                   - IPC: verify-pin 핸들러
└── preload.js    - contextBridge
                    - window.electronAPI.verifyPin(pin) 노출
```

### 창 크기 정책

```javascript
const { workArea } = screen.getPrimaryDisplay()
// workArea = 전체 화면 - 작업표시줄 영역
// frame: false = 시스템 타이틀바 없음 (앱 내 종료 버튼으로 대체)
```

---

## 4. 파일 목록 및 역할

```
tcg_trade_kiosk/
├── app/
│   ├── layout.tsx              - 루트 레이아웃 (다크 테마, 폰트)
│   └── page.tsx                - 메인 페이지 (모달 상태 관리)
├── components/
│   ├── full-width-grid.tsx     - 카드 그리드 뷰 (메인 화면)
│   ├── card-detail-modal.tsx   - 카드 상세 / 편집 / 삭제
│   ├── global-admin-modal.tsx  - 관리자 대시보드
│   ├── cart-list-modal.tsx     - 장바구니 및 요청 제출
│   ├── pin-auth-overlay.tsx    - PIN 인증 오버레이
│   └── rarity-picker.tsx       - 레어도 칩 선택 UI
├── electron/
│   ├── main.js                 - Electron 메인 프로세스
│   └── preload.js              - IPC 브릿지
├── lib/
│   ├── mock-cards.ts           - 초기 카드 데이터 (유희왕 블레이징 도미니언)
│   ├── use-cards.ts            - 카드/탭 스토어 + localStorage 영속화
│   ├── use-cart.ts             - 장바구니 스토어
│   └── use-orders.ts           - 매입 요청 스토어
├── public/
│   └── cards/                  - 카드 이미지 PNG (BLZD-KR***.png)
├── build/
│   ├── create-icon.py          - 아이콘 생성 스크립트 (Python/Pillow)
│   └── icon.ico                - 앱 아이콘 (16~256px 멀티사이즈)
├── config.json                 - 관리자 PIN (gitignore, 자동 생성)
├── setup.bat                   - 새 환경 빌드 자동화 배치파일
├── next.config.mjs             - Next.js 설정 (output: export)
└── package.json                - 의존성 + electron-builder 설정
```

---

## 5. 운영 가이드

### 키오스크 PC 설치 (최종 사용자)

1. `TCG 매입 키오스크.exe` 파일을 원하는 폴더에 복사
2. 같은 폴더에 `config.json` 생성 (없으면 자동 생성됨)
3. `config.json` 내용:
   ```json
   {
     "adminPin": "원하는 4자리 숫자"
   }
   ```
4. exe 더블클릭으로 실행 — 별도 설치 없음

### 관리자 사용법

| 작업 | 방법 |
|------|------|
| 관리자 진입 | 우측 상단 ⚙️ 버튼 → PIN 입력 |
| PIN 기본값 | `1234` |
| 카드 추가 | 관리자 → 카드추가 탭 → 코드/이름/카테고리 입력 → 레어도 클릭 → 가격 입력 |
| 카드 수정 | 카드 클릭 → 수정 버튼 → 편집 모드 |
| 카드 삭제 | 카드 클릭 → 수정 버튼 → 삭제 버튼 → 확인 |
| 매입 중지 | 관리자 → 카드관리 탭 → 중지 버튼 |
| 탭 추가 | 관리자 → 탭관리 탭 → 탭 이름 입력 → 추가 |
| 앱 종료 | 헤더 우측 ⏻ 전원 버튼 |

### 카드 이미지 추가

카드 이미지는 `public/cards/` 폴더에 PNG 형식으로 저장합니다.  
파일명은 카드 코드와 일치해야 합니다.

```
public/cards/BLZD-KR002.png
public/cards/BLZD-KR014.png
...
```

> exe 배포 후 이미지를 추가하려면 재빌드가 필요합니다.  
> (이미지는 빌드 시 asar에 번들링됨)

### PIN 변경

1. `config.json` 열기
2. `adminPin` 값 수정
3. 앱 재시작

```json
{
  "adminPin": "9999"
}
```

---

## 6. 데이터 관리

### 카드 데이터 (영속)

- 저장 위치: 브라우저 localStorage (`tcg_kiosk_cards`, `tcg_kiosk_tabs`)
- 변경 시점: 카드 추가/수정/삭제/중지 즉시 자동 저장
- 초기 데이터: `lib/mock-cards.ts`의 `mockCards` 배열 (localStorage 없을 때만 사용)

### 매입 요청 (비영속)

- 저장 위치: 앱 메모리 (in-memory store)
- 앱 재시작 시 초기화됨
- 영속화 필요 시: `lib/use-orders.ts`에 localStorage 로직 추가 권장

### 초기 카드 데이터 변경

`lib/mock-cards.ts`의 `mockCards` 배열을 편집합니다.

```typescript
makeCard('BLZD-KR002', '파워 바이스드래곤', '블레이징 도미니언', {
  SR: 700,   // 레어도: 가격 (0이면 비활성)
  SE: 2500
})
```

> 이미 저장된 localStorage가 있으면 초기 데이터보다 우선합니다.  
> 초기화하려면 브라우저 개발자 도구에서 `localStorage.clear()` 실행.

---

## 7. 빌드 재배포

### 카드 데이터 또는 이미지 변경 후 재빌드

```
1. lib/mock-cards.ts 수정 또는 public/cards/ 에 이미지 추가
2. setup.bat 실행 (또는 pnpm electron:build)
3. 생성된 .exe 파일 납품
```

### 버전 변경

`package.json`의 `version` 필드를 수정하면 exe 파일명에 반영됩니다.

```json
{
  "version": "0.2.0"
}
```

---

## 8. 알려진 제한 사항 및 향후 개선 과제

| 항목 | 현황 | 개선 방향 |
|------|------|-----------|
| 매입 요청 영속화 | 앱 재시작 시 초기화 | localStorage 또는 SQLite 저장 |
| 카드 이미지 동적 추가 | 재빌드 필요 | 외부 폴더에서 로드하는 옵션 추가 |
| 다중 PC 동기화 | 각 PC 독립 운영 | 중앙 서버 또는 공유 폴더 방식 |
| 보안 (PIN) | 로컬 파일 기반, 평문 저장 | 해시 저장 또는 OS 인증 연동 |
| 자동 업데이트 | 미구현 | electron-updater 도입 |
| 프린터 연동 | 미구현 | 매입 확인서 열지 인쇄 |

---

## 9. 개발 환경 재구성

새 PC에서 개발을 이어받을 경우:

```bash
# 1. 저장소 클론
git clone https://github.com/Enceladus-X/tcg_trade_kiosk.git
cd tcg_trade_kiosk

# 2. Node.js 18+ 설치 (https://nodejs.org)

# 3. setup.bat 실행 (또는 아래 수동 실행)
pnpm install
pnpm dev          # 개발 서버
pnpm electron:build  # exe 빌드
```

개발 시 브라우저(`http://localhost:3000`)에서 대부분의 기능을 확인할 수 있습니다.  
Electron 특화 기능(PIN IPC, 창 크기)은 `pnpm electron:dev`로 Electron 환경에서 테스트합니다.

---

## 10. 연락처 / 담당자

| 항목 | 내용 |
|------|------|
| 개발 | Holick / Enceladus-X |
| 저장소 | https://github.com/Enceladus-X/tcg_trade_kiosk |
| 납품처 | 마린포드 싱글카드 매장 |
| 납품일 | 2026-04-14 |
