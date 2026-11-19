-- تطبيق «أثر»: عدّاد مستخدمين مجهول (منفصل تماماً عن جداول AgriTrade)
-- ينشئ جدولاً ودالتين جديدتين فقط، ولا يعدّل أو يحذف أي بيانات موجودة.
-- لا يُخزَّن أي IP أو موقع أو معرّف للجهاز: فقط رقم عشوائي يولّده التطبيق ونوع النسخة.
create table if not exists public.athar_installs (
  id uuid primary key,
  platform text not null check (platform in ('android','pwa','web')),
  build int not null default 0,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index if not exists athar_installs_last_seen on public.athar_installs (last_seen desc);

alter table public.athar_installs enable row level security;
revoke all on public.athar_installs from anon, authenticated;

-- التسجيل الوحيد المسموح للعامة: مرة يومياً من كل جهاز
create or replace function public.athar_ping(p_id uuid, p_platform text, p_build int default 0)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null or p_platform not in ('android','pwa','web') then return; end if;
  insert into public.athar_installs (id, platform, build)
  values (p_id, p_platform, greatest(0, least(coalesce(p_build, 0), 1000000)))
  on conflict (id) do update
    set last_seen = now(), platform = excluded.platform, build = excluded.build;
end;
$$;
revoke all on function public.athar_ping(uuid, text, int) from public;
grant execute on function public.athar_ping(uuid, text, int) to anon, authenticated;

-- الإحصائيات للمالك فقط (من لوحة Supabase أو بمفتاح الخدمة)
create or replace function public.athar_stats()
returns table (platform text, total bigint, active_today bigint, active_7d bigint, active_30d bigint, new_today bigint)
language sql
security definer
set search_path = public
as $$
  select coalesce(platform, 'الكل'),
         count(*),
         count(*) filter (where last_seen > now() - interval '1 day'),
         count(*) filter (where last_seen > now() - interval '7 days'),
         count(*) filter (where last_seen > now() - interval '30 days'),
         count(*) filter (where first_seen > now() - interval '1 day')
  from public.athar_installs
  group by rollup (platform)
  order by platform nulls first;
$$;
revoke all on function public.athar_stats() from public, anon, authenticated;
