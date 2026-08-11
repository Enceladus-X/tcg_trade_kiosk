# 운영 안전장치

## 적용 범위

관리자 링크는 기존처럼 4자리 PIN으로 연다. 링크를 아는 사람만 접근한다는 운영 전제를 유지하되, PIN 자체는 브라우저에 평문으로만 남지 않도록 데이터베이스 RPC를 우선 사용한다.

현재 구현된 보호 계층은 다음과 같다.

- `verify_admin_pin` RPC: Supabase 안에서 PIN 해시 비교, 5회 실패 시 15분 잠금, 성공/실패 감사 로그 기록
- 관리자 세션: `sessionStorage` 기반, 30분 유휴 만료·최대 8시간 만료. 활동 중인 관리자 화면은 자동으로 세션을 갱신한다.
- 구버전 배포 호환: RPC가 아직 배포되지 않은 동안에는 Electron PIN 또는 기존 `store_settings.admin_password`를 임시 fallback으로 사용한다. 마이그레이션 적용 후에는 RPC가 기준이다.
- 주문 중복 방지: 결제/접수 버튼을 빠르게 여러 번 눌러도 `client_request_id` unique index로 한 번만 주문을 만든다.
- 입력 방어: 고객명·전화번호·계좌번호 정규화, 빈 주문·음수 가격·비정상 수량 차단
- 고아 주문 정리: 주문 본체 생성 뒤 항목 삽입이 실패하면 주문 본체를 즉시 삭제한다.
- 총액 무결성: `order_items` 변경 시 DB 트리거가 지급 방식과 마일리지 배율을 기준으로 `orders.total_price`를 다시 계산한다.
- 원격 기능 잠금: `store_settings.feature_flags.public_buyback_enabled`를 false로 바꾸면 고객 접수를 즉시 멈춘다. 택배 매입은 현재 기본값 false다.

## Supabase 적용 순서

1. Supabase Dashboard → SQL Editor에서 [`_scripts/security_guardrails.sql`](../_scripts/security_guardrails.sql)을 한 번 실행한다.
2. 아래 쿼리로 설정과 PIN 해시가 생성됐는지 확인한다.

```sql
select id, feature_flags, updated_at from public.store_settings where id = 1;
select id, pin_hash is not null as pin_configured, failed_attempts, locked_until
from public.admin_pin_config where id = 1;
select public.verify_admin_pin('0000'); -- 실패 응답만 확인하고 실제 PIN은 노출하지 않는다.
```

3. 관리자 설정에서 PIN을 변경할 때는 현재 화면의 저장 기능을 사용한다. 기존 `admin_password` 값은 레거시 fallback을 위해 당분간 남겨두며, 운영 DB 백업 후 별도 해시 전용 컬럼으로 완전히 이전할 수 있다.

## 운영 권장값

```sql
-- 고객 접수 긴급 중지
update public.store_settings
set feature_flags = jsonb_set(coalesce(feature_flags, '{}'::jsonb), '{public_buyback_enabled}', 'false'::jsonb),
    updated_at = now()
where id = 1;

-- 택배 매입은 회원번호·약관·신분증 흐름이 준비될 때까지 비활성화
update public.store_settings
set feature_flags = jsonb_set(coalesce(feature_flags, '{}'::jsonb), '{shipping_buyback_enabled}', 'false'::jsonb),
    updated_at = now()
where id = 1;
```

현재 저장소는 정적 Next export라 서버 API가 없다. 따라서 Supabase RPC와 RLS가 실제 서버 경계다. 기존 `allow_all_*` 정책은 관리자 기능을 anon 키로 유지하기 위한 레거시 정책이므로, 다음 단계에서는 Supabase Auth 또는 별도 관리자 서비스 역할로 분리하고 공개 주문 쓰기 정책을 RPC 전용으로 좁혀야 한다. 이 정책 변경은 현장 운영에 영향을 주므로 별도 백업과 스테이징 검증 후 진행한다.

## 확인 시나리오

- PIN 4자리 성공 → 관리자 모달 열림 → 30분 이상 유휴 후 PIN 재요청
- PIN 5회 실패 → 15분 동안 입력 차단 → DB `admin_auth_events`에 기록
- 네트워크가 느린 상태에서 접수 버튼 연속 클릭 → 동일 `client_request_id` 주문 1건
- 카드 항목 삽입 실패를 시뮬레이션 → `orders`에 고아 pending 행이 남지 않음
- 주문 항목의 가격·수량·지급방식 수정 → DB 트리거 이후 `orders.total_price`가 서버 기준으로 재계산
- `public_buyback_enabled=false` → 고객 매입 접수 차단, 관리자 화면은 계속 접근 가능
