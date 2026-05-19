# 마린포드 TCG 매입 키오스크

![version](https://img.shields.io/badge/version-v0.5.9-amber)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)
![Platform](https://img.shields.io/badge/platform-Windows_x64-0078D6?logo=windows)
![License](https://img.shields.io/badge/license-private-red)

마린포드 매장에서 사용하는 TCG 싱글카드 매입 키오스크입니다.  
고객은 키오스크에서 직접 카드를 찾고 매입 요청을 넣을 수 있고, 직원은 관리자 화면에서 주문 확인, 가격 조정, 출력, 카드 관리, 설정을 처리할 수 있습니다.

- 현재 준비 버전: `v0.5.9`
- 최신 공개 릴리스: [Releases](https://github.com/Enceladus-X/tcg_trade_kiosk/releases/latest)
- 배포 형식: Windows x64 포터블 실행 파일 `MarinfordKiosk_v{version}.exe`

---

## 주요 기능

### 고객 화면

- 게임 선택
- 확장팩 탭 선택
- 레어도 필터
- 카드 검색
- 카드 상세 모달에서 레어도별 매입가 확인
- 수량 선택 후 장바구니 담기
- 현금 / 마일리지 지급 방식 선택
- 고객 정보 입력 후 매입 요청 제출

### 관리자 화면

- 관리자 인증 진입
- 주문 검색 및 상태 처리
- 고객 정보 복사
- 견적서 출력
- 영수증 출력
- 카드별 가격 조정
- 가격 조정 사유 기록
- 카드 추가 / 수정 / 삭제
- 카드 이미지 관리
- 카드 일괄 편집
- CSV 가져오기 / 내보내기
- 게임 / 탭 관리
- 마일리지 배율 설정
- 통계 확인

---

## 현재 버전 기준 변경점

현재 `v0.5.9` 기준으로 다음 기능이 포함되어 있습니다.

- 견적서 / 영수증 출력
- 마일리지 배율 및 적용 지급액 표시
- 가격 조정 사유 저장 및 이력 관리
- 주문 검색 기능
- 카드 일괄 편집용 CSV 가져오기 / 내보내기
- 카드 추가 및 게임 관리 UI 개선
- 설정 레어도 기반 카드 추가 / 카드 수정 폼 동기화
- 원피스 전용 레어도 고정 색상 팔레트 추가
- 관리자 주문 편집에서 매수 조절 및 품목 삭제 추가
- 카드 수정 화면에서 게임 / 탭 변경 추가
- 탭 없는 게임 배정을 위한 카드 소속 컬럼 준비
- 메인 화면 탭 / 검색 / 동기화 상태 안정화
- 장바구니 및 상세 모달 애니메이션 개선
- 매입 요청 목록의 게임 로고 식별 표시
- 가격 조정 취소 및 감가 분리 품목 복구
- 카드 레어도/가격 단위 매입 중지 및 재개
- 매입 요청 거절 확인 및 거절 취소
- 통계 인기 매입 카드 표시 범위 확대

상세 변경 내역은 [GitHub Releases](https://github.com/Enceladus-X/tcg_trade_kiosk/releases)에서 확인할 수 있습니다.

---

## 설치 및 실행

1. [Releases](https://github.com/Enceladus-X/tcg_trade_kiosk/releases/latest)에서 최신 `MarinfordKiosk_v*.exe`를 다운로드합니다.
2. 원하는 폴더에 복사합니다.
3. 실행 파일을 더블클릭해 바로 실행합니다.

별도 설치는 필요하지 않지만, 데이터 동기화를 위해 인터넷 연결이 필요합니다.

---

## 개발 환경 실행

### 요구 사항

- Node.js LTS
- pnpm

### 설치

```bash
pnpm install
```

### 개발 서버

```bash
pnpm dev
```

### Next.js 빌드

```bash
pnpm build
```

### Electron 개발 실행

```bash
pnpm electron:dev
```

### Electron 포터블 빌드

```bash
pnpm electron:build
```

빌드 결과물은 `dist/MarinfordKiosk_v{version}.exe`로 생성됩니다.

---

## 환경 변수

프로젝트 루트에 `.env.local` 파일을 두고 필요한 백엔드 접속 정보를 설정합니다.

예시:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

실제 운영 값은 저장소에 포함하지 않습니다.

---

## 프로젝트 구조

```text
tcg_trade_kiosk/
├── app/
├── components/
├── electron/
├── lib/
├── public/
├── release-notes/
├── _scripts/
├── build/
├── dist/
└── README.md
```

---

## 문서

- 릴리스 노트: [release-notes](C:\Users\Holick\Desktop\Files\TASKS\PROJECTS\tcg_trade_kiosk\release-notes)
- GitHub 릴리스: [Releases](https://github.com/Enceladus-X/tcg_trade_kiosk/releases)
