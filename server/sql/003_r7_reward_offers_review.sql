-- Review only. Requires 002_r7_store_analytics_review.sql. Not applied.
begin;
create table public.r7_reward_offers (
 offer_id uuid primary key default gen_random_uuid(),
 store_id text not null references public.r7_store_directory(store_id),
 title text not null check(char_length(title) between 1 and 120),
 terms text not null,
 coin_cost bigint not null check(coin_cost>=0),
 starts_at timestamptz not null,
 ends_at timestamptz not null check(ends_at>starts_at),
 approved boolean not null default false
);
create table public.r7_reward_redemptions (
 redemption_id uuid primary key default gen_random_uuid(),
 offer_id uuid not null references public.r7_reward_offers(offer_id),
 user_id uuid not null references auth.users(id),
 request_id uuid not null unique,
 coin_cost bigint not null check(coin_cost>=0),
 status text not null default 'pending' check(status in ('pending','confirmed','cancelled')),
 created_at timestamptz not null default now(),
 confirmed_at timestamptz,
 check((status='confirmed')=(confirmed_at is not null))
);
alter table public.r7_reward_offers enable row level security;
alter table public.r7_reward_redemptions enable row level security;
revoke all on public.r7_reward_offers,public.r7_reward_redemptions from public,anon,authenticated;
grant select on public.r7_reward_offers,public.r7_reward_redemptions to authenticated;
create policy r7_offer_visible on public.r7_reward_offers for select to authenticated using(
 approved and starts_at<=now() and ends_at>now()
);
create policy r7_redemption_self on public.r7_reward_redemptions for select to authenticated using(user_id=(select auth.uid()));
-- No offers seeded, no coin rates, no balance mutations.
-- Future trusted transaction must lock the existing authoritative wallet,
-- verify store approval, validity and stock, debit once per request_id,
-- and count reward_redeemed only on authenticated store confirmation.
-- Do not create a second wallet or accept browser-supplied balances.
commit;
