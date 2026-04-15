-- Supabase 대시보드 SQL Editor에서 실행
-- https://supabase.com/dashboard/project/<your-project>/sql

-- 1. 카테고리 탭
CREATE TABLE tabs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

-- 2. 카드
--    prices, enabled_rarities: JSONB 유지 (레어도 조회는 항상 카드 단위이므로 JOIN 비용 없음)
CREATE TABLE cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  code             TEXT NOT NULL,
  category         TEXT NOT NULL,   -- tabs.name 비정규화. 탭 삭제 시 NULL 처리 불필요
  image_url        TEXT,
  is_stopped       BOOLEAN NOT NULL DEFAULT false,
  prices           JSONB NOT NULL DEFAULT '[]',
  enabled_rarities JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 3. 주문
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  customer_name   TEXT NOT NULL,
  bank_name       TEXT NOT NULL,
  account_number  TEXT NOT NULL,
  phone_last4     TEXT NOT NULL,
  total_price     INT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'paid', 'rejected'))
);

-- 4. 주문 항목
--    card_name, card_code: 카드 삭제 후에도 주문 기록 보존을 위한 스냅샷
CREATE TABLE order_items (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id  UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  card_id   UUID REFERENCES cards(id) ON DELETE SET NULL,
  card_name TEXT NOT NULL,
  card_code TEXT NOT NULL,
  rarity    TEXT NOT NULL,
  price     INT NOT NULL,
  quantity  INT NOT NULL DEFAULT 1
);

-- 5. Realtime 활성화 (대시보드 Database > Replication에서도 설정 필요)
ALTER PUBLICATION supabase_realtime ADD TABLE cards;
ALTER PUBLICATION supabase_realtime ADD TABLE tabs;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- 6. RLS (Row Level Security) — 일단 전체 허용으로 시작, 추후 정책 추가
ALTER TABLE tabs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_tabs"        ON tabs        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_cards"       ON cards       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_orders"      ON orders      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
