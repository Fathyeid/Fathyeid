-- تطبيق «أثر»: فهرس المكتبة الدعوية (منفصل تماماً عن جداول AgriTrade)
-- ينشئ جداول جديدة فقط، ولا يعدّل أو يحذف أي بيانات موجودة.
create table if not exists public.athar_channels (
  channel_id text primary key,
  sheikh text not null check (sheikh in ('samir','amgad')),
  title text not null,
  official_source text not null,
  active boolean not null default true,
  last_synced timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.athar_videos (
  video_id text primary key,
  channel_id text not null references public.athar_channels(channel_id) on delete cascade,
  sheikh text not null,
  title text not null,
  description text,
  published_at timestamptz,
  topics text[] not null default '{}',
  first_seen timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists athar_videos_sheikh_pub on public.athar_videos (sheikh, published_at desc);
create index if not exists athar_videos_pub on public.athar_videos (published_at desc);
create index if not exists athar_videos_topics on public.athar_videos using gin (topics);
create table if not exists public.athar_sync_runs (
  id bigserial primary key,
  ran_at timestamptz not null default now(),
  channel_id text,
  fetched int,
  upserted int,
  error text
);
alter table public.athar_channels enable row level security;
alter table public.athar_videos enable row level security;
alter table public.athar_sync_runs enable row level security;
drop policy if exists athar_channels_read on public.athar_channels;
create policy athar_channels_read on public.athar_channels for select to anon, authenticated using (true);
drop policy if exists athar_videos_read on public.athar_videos;
create policy athar_videos_read on public.athar_videos for select to anon, authenticated using (true);

insert into public.athar_channels (channel_id, sheikh, title, official_source) values
  ('UCch6Y4YgssEzMa4Q5zw4xjw','samir','قناة الشيخ سمير مصطفى الرسمية','https://samirmoustafa.com'),
  ('UC_FFy2YxiElNMba-t-6VwTA','amgad','قناة الشيخ أمجد سمير الرسمية','https://sites.google.com/view/amgad-samir/home'),
  ('UCoFflcHXUS78RlNMQJDbNGw','amgad','أمجد سمير | القناة العلمية','https://sites.google.com/view/amgad-samir/home')
on conflict (channel_id) do nothing;
