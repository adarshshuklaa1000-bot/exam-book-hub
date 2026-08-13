create extension if not exists pgcrypto;

create table if not exists public.exam_categories (
  id uuid primary key default gen_random_uuid(),
  group_name text not null default 'Other',
  name text not null unique,
  icon text default '📚',
  created_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  exam_category_id uuid not null references public.exam_categories(id) on delete restrict,
  author text default '',
  year text default '',
  description text not null,
  tags text default '',
  cover_path text,
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exam_categories enable row level security;
alter table public.books enable row level security;

drop policy if exists "Public can read categories" on public.exam_categories;
create policy "Public can read categories" on public.exam_categories for select to anon, authenticated using (true);
drop policy if exists "Public can read books" on public.books;
create policy "Public can read books" on public.books for select to anon, authenticated using (true);

drop policy if exists "Admin insert categories" on public.exam_categories;
create policy "Admin insert categories" on public.exam_categories for insert to authenticated
with check (lower(auth.jwt()->>'email')=lower('adarshshuklaa1000@gmail.com'));
drop policy if exists "Admin update categories" on public.exam_categories;
create policy "Admin update categories" on public.exam_categories for update to authenticated
using (lower(auth.jwt()->>'email')=lower('adarshshuklaa1000@gmail.com'))
with check (lower(auth.jwt()->>'email')=lower('adarshshuklaa1000@gmail.com'));
drop policy if exists "Admin delete categories" on public.exam_categories;
create policy "Admin delete categories" on public.exam_categories for delete to authenticated
using (lower(auth.jwt()->>'email')=lower('adarshshuklaa1000@gmail.com'));

drop policy if exists "Admin insert books" on public.books;
create policy "Admin insert books" on public.books for insert to authenticated
with check (lower(auth.jwt()->>'email')=lower('adarshshuklaa1000@gmail.com'));
drop policy if exists "Admin update books" on public.books;
create policy "Admin update books" on public.books for update to authenticated
using (lower(auth.jwt()->>'email')=lower('adarshshuklaa1000@gmail.com'))
with check (lower(auth.jwt()->>'email')=lower('adarshshuklaa1000@gmail.com'));
drop policy if exists "Admin delete books" on public.books;
create policy "Admin delete books" on public.books for delete to authenticated
using (lower(auth.jwt()->>'email')=lower('adarshshuklaa1000@gmail.com'));

insert into storage.buckets (id,name,public) values ('book-files','book-files',true)
on conflict (id) do update set public=true;

drop policy if exists "Public can read book files" on storage.objects;
create policy "Public can read book files" on storage.objects for select to anon, authenticated
using (bucket_id='book-files');
drop policy if exists "Admin can upload book files" on storage.objects;
create policy "Admin can upload book files" on storage.objects for insert to authenticated
with check (bucket_id='book-files' and lower(auth.jwt()->>'email')=lower('adarshshuklaa1000@gmail.com'));
drop policy if exists "Admin can update book files" on storage.objects;
create policy "Admin can update book files" on storage.objects for update to authenticated
using (bucket_id='book-files' and lower(auth.jwt()->>'email')=lower('adarshshuklaa1000@gmail.com'))
with check (bucket_id='book-files' and lower(auth.jwt()->>'email')=lower('adarshshuklaa1000@gmail.com'));
drop policy if exists "Admin can delete book files" on storage.objects;
create policy "Admin can delete book files" on storage.objects for delete to authenticated
using (bucket_id='book-files' and lower(auth.jwt()->>'email')=lower('adarshshuklaa1000@gmail.com'));

INSERT INTO public.exam_categories (group_name, name, icon)
VALUES
('SSC','SSC CGL','🎯'),
('SSC','SSC CHSL','📘'),
('SSC','SSC MTS','📝'),
('SSC','SSC GD Constable','🛡️'),
('SSC','SSC CPO','👮'),
('SSC','SSC JE','🔧'),
('SSC','SSC Stenographer Grade C & D','⌨️'),
('Railway','RRB NTPC','🚆'),
('Railway','RRB Group D','⚡'),
('Railway','RRB ALP','🔧'),
('Railway','RRB Technician','🛠️'),
('Railway','RRB JE','⚙️'),
('Railway','RPF Constable','🛡️'),
('Railway','RPF SI','👮'),
('Uttar Pradesh','UPPSC PCS','🏛️'),
('Uttar Pradesh','UPPSC RO/ARO','📋'),
('Uttar Pradesh','UPSSSC PET','📝'),
('Uttar Pradesh','UP Police Constable','👮'),
('Bihar','BPSC CCE','🏛️'),
('Bihar','BSSC CGL','🎯'),
('Bihar','Bihar Police Constable','👮'),
('Rajasthan','RPSC RAS','🏛️'),
('Rajasthan','REET','📚'),
('Rajasthan','Rajasthan Police Constable','👮'),
('Madhya Pradesh','MPPSC State Service','🏛️'),
('Madhya Pradesh','MP Police Constable','👮'),
('Maharashtra','MPSC Rajyaseva','🏛️'),
('Delhi','DSSSB','🏢'),
('Delhi','Delhi Police Constable','🚓'),
('Haryana','HPSC HCS','🏛️'),
('Haryana','HSSC CET','📝'),
('Punjab','PPSC PCS','🏛️'),
('Gujarat','GPSC','🏛️'),
('West Bengal','WBCS','🏛️'),
('Jharkhand','JPSC','🏛️'),
('Chhattisgarh','CGPSC','🏛️'),
('Uttarakhand','UKPSC','🏛️'),
('Himachal Pradesh','HPPSC','🏛️'),
('Odisha','OPSC','🏛️'),
('Andhra Pradesh','APPSC','🏛️'),
('Telangana','TSPSC','🏛️'),
('Karnataka','KPSC','🏛️'),
('Tamil Nadu','TNPSC Group 1','🏛️'),
('Kerala','Kerala PSC','🏛️'),
('Assam','APSC CCE','🏛️'),
('Jammu & Kashmir','JKPSC','🏛️'),
('National','IBPS PO','🏦'),
('National','IBPS Clerk','🏦'),
('National','SBI PO','🏦'),
('National','SBI Clerk','🏦'),
('National','NDA','🎖️'),
('National','CDS','🎖️'),
('National','CTET','👨‍🏫')
ON CONFLICT (name) DO NOTHING;
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at before update on public.books
for each row execute function public.set_updated_at();
-- ================= ANNOUNCEMENTS =================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Announcement',
  message text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "Public can read active announcements"
on public.announcements;

create policy "Public can read active announcements"
on public.announcements
for select
to anon, authenticated
using (active = true);

drop policy if exists "Admin insert announcements"
on public.announcements;

create policy "Admin insert announcements"
on public.announcements
for insert
to authenticated
with check (
  lower(auth.jwt()->>'email')
  = lower('adarshshuklaa1000@gmail.com')
);

drop policy if exists "Admin update announcements"
on public.announcements;

create policy "Admin update announcements"
on public.announcements
for update
to authenticated
using (
  lower(auth.jwt()->>'email')
  = lower('adarshshuklaa1000@gmail.com')
)
with check (
  lower(auth.jwt()->>'email')
  = lower('adarshshuklaa1000@gmail.com')
);

drop policy if exists "Admin delete announcements"
on public.announcements;

create policy "Admin delete announcements"
on public.announcements
for delete
to authenticated
using (
  lower(auth.jwt()->>'email')
  = lower('adarshshuklaa1000@gmail.com')
);

