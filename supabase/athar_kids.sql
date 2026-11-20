-- موسوعة الطفل في تطبيق «أثر»: النسخ الاحتياطي والمزامنة برمز العائلة.
-- لا علاقة لها بحسابات المستخدمين (auth.users) ولا بأي جدول آخر في المشروع.
-- لا يصل إليها المفتاح العام (anon) إطلاقاً: كل القراءة والكتابة عبر دالة athar-kids-sync فقط.
create table if not exists public.athar_kids_families (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,            -- بصمة SHA-256 لرمز العائلة، لا الرمز نفسه
  parent jsonb not null default '{}'::jsonb, -- بصمة رمز ولي الأمر (PIN) فقط
  created_at timestamptz not null default now(),
  synced_at timestamptz not null default now()
);
create table if not exists public.athar_kids_children (
  family_id uuid not null references public.athar_kids_families(id) on delete cascade,
  kid_id text not null check (length(kid_id) between 1 and 32),
  data jsonb not null,                       -- الملف (اسم مستعار، عمر، شخصية، قواعد) والتقدّم
  updated_at timestamptz not null default now(),
  primary key (family_id, kid_id)
);
alter table public.athar_kids_families enable row level security;
alter table public.athar_kids_children enable row level security;
revoke all on public.athar_kids_families, public.athar_kids_children from anon, authenticated;
