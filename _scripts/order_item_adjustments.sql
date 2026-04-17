begin;

create table if not exists public.order_item_adjustments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  card_name text not null,
  rarity text not null,
  previous_price integer not null,
  next_price integer not null,
  note text,
  changed_at timestamptz not null default now()
);

create index if not exists idx_order_item_adjustments_order_id
  on public.order_item_adjustments(order_id, changed_at desc);

create index if not exists idx_order_item_adjustments_order_item_id
  on public.order_item_adjustments(order_item_id, changed_at desc);

alter table public.order_item_adjustments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_item_adjustments'
      and policyname = 'allow_all_order_item_adjustments'
  ) then
    create policy "allow_all_order_item_adjustments"
      on public.order_item_adjustments
      for all
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.order_item_adjustments;
  exception
    when duplicate_object then null;
  end;
end $$;

commit;
