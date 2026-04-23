begin;

alter table public.order_items
add column if not exists payment_method text;

comment on column public.order_items.payment_method
is '주문 항목별 지급 방식 (cash | mileage)';

commit;
