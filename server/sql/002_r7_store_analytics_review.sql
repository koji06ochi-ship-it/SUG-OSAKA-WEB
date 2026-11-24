-- R7 store analytics: review-only SQL, not applied.
begin;
create table public.r7_store_directory (
 store_id text primary key,
 display_name text not null,
 active boolean not null default true
);
create table public.r7_store_members (
 store_id text not null references public.r7_store_directory(store_id),
 user_id uuid not null references auth.users(id),
 primary key(store_id,user_id)
);
create table public.r7_store_admins (
 user_id uuid primary key references auth.users(id)
);
create table public.r7_store_daily (
 store_id text not null references public.r7_store_directory(store_id),
 day_jst date not null,
 metric text not null check(metric in ('detail','instagram','website','route','video_play','reward_redeemed')),
 total bigint not null default 0 check(total >= 0),
 primary key(store_id,day_jst,metric)
);
alter table public.r7_store_directory enable row level security;
alter table public.r7_store_members enable row level security;
alter table public.r7_store_admins enable row level security;
alter table public.r7_store_daily enable row level security;
revoke all on public.r7_store_directory,public.r7_store_members,public.r7_store_admins,public.r7_store_daily from public,anon,authenticated;
grant select on public.r7_store_directory,public.r7_store_members,public.r7_store_admins,public.r7_store_daily to authenticated;
create policy r7_member_self on public.r7_store_members for select to authenticated using(user_id=(select auth.uid()));
create policy r7_admin_self on public.r7_store_admins for select to authenticated using(user_id=(select auth.uid()));
create policy r7_directory_read on public.r7_store_directory for select to authenticated using(
 exists(select 1 from public.r7_store_members m where m.store_id=r7_store_directory.store_id and m.user_id=(select auth.uid()))
 or exists(select 1 from public.r7_store_admins a where a.user_id=(select auth.uid()))
);
create policy r7_daily_read on public.r7_store_daily for select to authenticated using(
 exists(select 1 from public.r7_store_members m where m.store_id=r7_store_daily.store_id and m.user_id=(select auth.uid()))
 or exists(select 1 from public.r7_store_admins a where a.user_id=(select auth.uid()))
);
insert into public.r7_store_directory(store_id,display_name) values
 ('osaka-chakai','大阪茶会'),('ryo','焼肉ホルモン 暸'),('sug-osaka','S.u.G大阪'),('hachikenya','川の駅はちけんや');
-- No browser insert/update grants. Ingestion and verified redemption require
-- separately approved server-side authentication, rate limiting and deduplication.
-- No account assignments, synthetic counts or billing configuration.
commit;
