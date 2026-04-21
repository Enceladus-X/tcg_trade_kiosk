begin;

alter table public.cards
add column if not exists game_id uuid references public.games(id) on delete set null;

alter table public.cards
add column if not exists tab_id uuid references public.tabs(id) on delete set null;

create index if not exists idx_cards_game_id on public.cards(game_id);
create index if not exists idx_cards_tab_id on public.cards(tab_id);

commit;
