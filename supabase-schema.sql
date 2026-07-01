-- ============================================================================
-- NOX PORTFOLIO APP — VÉGLEGES, TELJES SUPABASE SÉMA (idempotens)
--
-- Ez a séma a JELENLEGI, működő végállapotot tükrözi — minden tábla,
-- minden oszlop, minden RLS policy és storage bucket amit ténylegesen
-- használ a kód, abban a formában ahogy most élesben van.
--
-- IDEMPOTENS: ha újra lefuttatod, nem változik semmi és nem dob hibát —
-- minden "create table" if not exists, minden policy előbb drop-olva majd
-- újra létrehozva, minden insert "on conflict do nothing/update".
--
-- Supabase Dashboard → SQL Editor → New query → Paste → Run
-- ============================================================================


-- ============================================================================
-- 1. MESSAGES — kapcsolatfelvételi űrlap üzenetei
-- ============================================================================

create table if not exists public.messages (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  name           text not null,
  email          text not null,
  service        text,
  message        text not null,
  read           boolean not null default false,
  attachment_url text
);

-- Ha a tábla korábbi verzióból jön és hiányzik az oszlop, pótoljuk
alter table public.messages
  add column if not exists attachment_url text;

alter table public.messages enable row level security;

drop policy if exists "Public insert"          on public.messages;
drop policy if exists "Admin select"           on public.messages;
drop policy if exists "Admin update"           on public.messages;
drop policy if exists "Admin delete"           on public.messages;
drop policy if exists "Public insert messages" on public.messages;
drop policy if exists "Admin select messages"  on public.messages;
drop policy if exists "Admin update messages"  on public.messages;
drop policy if exists "Admin delete messages"  on public.messages;

create policy "Public insert messages"
  on public.messages for insert
  with check (true);

create policy "Admin select messages"
  on public.messages for select
  using (auth.role() = 'authenticated');

create policy "Admin update messages"
  on public.messages for update
  using (auth.role() = 'authenticated');

create policy "Admin delete messages"
  on public.messages for delete
  using (auth.role() = 'authenticated');


-- ============================================================================
-- 2. PORTFOLIO_CATEGORIES — szerkeszthető portfólió kategóriák
-- ============================================================================

create table if not exists public.portfolio_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  label_hu   text not null,
  label_en   text not null,
  sort_order int not null default 0
);

alter table public.portfolio_categories enable row level security;

drop policy if exists "Public read categories" on public.portfolio_categories;
drop policy if exists "Admin all categories"   on public.portfolio_categories;

create policy "Public read categories"
  on public.portfolio_categories for select
  using (true);

create policy "Admin all categories"
  on public.portfolio_categories for all
  using (auth.role() = 'authenticated');

-- Jelenlegi, élesben használt kategóriák (NOX brand, végleges 5 db)
insert into public.portfolio_categories (slug, label_hu, label_en, sort_order) values
  ('nightlife',     'Nightlife',       'Nightlife',       1),
  ('studio',        'Studio',          'Studio',          2),
  ('rendezveny',    'Rendezvény',      'Events',          3),
  ('sport-kultura', 'Sport & Kultúra', 'Sport & Culture', 4),
  ('kreativ',       'Kreatív',         'Creative',        5)
on conflict (slug) do update
  set label_hu   = excluded.label_hu,
      label_en   = excluded.label_en,
      sort_order = excluded.sort_order;


-- ============================================================================
-- 3. PORTFOLIO_ITEMS — portfólió galéria elemei
-- ============================================================================

create table if not exists public.portfolio_items (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  title          text not null,
  category       text not null,
  cloudinary_url text not null,
  video_url      text,
  span           text not null default 'medium'
    check (span in ('large','medium','small')),
  sort_order     int not null default 0,
  visible        boolean not null default true
);

alter table public.portfolio_items enable row level security;

drop policy if exists "Public read portfolio" on public.portfolio_items;
drop policy if exists "Admin all portfolio"   on public.portfolio_items;

create policy "Public read portfolio"
  on public.portfolio_items for select
  using (true);

create policy "Admin all portfolio"
  on public.portfolio_items for all
  using (auth.role() = 'authenticated');


-- ============================================================================
-- 4. SERVICES — szolgáltatás kártyák
-- ============================================================================

create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  number       text not null,
  name_hu      text not null,
  name_en      text not null,
  desc_hu      text not null,
  desc_en      text not null,
  sort_order   int not null default 0,
  extra_fields jsonb not null default '[]'::jsonb
);

alter table public.services
  add column if not exists extra_fields jsonb not null default '[]'::jsonb;

alter table public.services enable row level security;

drop policy if exists "Public read services" on public.services;
drop policy if exists "Admin all services"   on public.services;

create policy "Public read services"
  on public.services for select
  using (true);

create policy "Admin all services"
  on public.services for all
  using (auth.role() = 'authenticated');

-- Az alap 3 szolgáltatás csak akkor kerül be, ha még egyik sincs jelen
-- (number alapján azonosítva — ha admin törölte vagy átírta, nem írjuk felül)
insert into public.services (number, name_hu, name_en, desc_hu, desc_en, sort_order)
select v.number, v.name_hu, v.name_en, v.desc_hu, v.desc_en, v.sort_order
from (values
  (
    '01', 'Rendezvény & Buli', 'Event & Party',
    'Bulik, rávek, underground partik dokumentálása. Teljes éjszakás jelenlét, szerkesztett képsorozat leadás másnapra.',
    'Parties, raves, underground events. Full-night coverage with edited photo sets delivered the next day.',
    1
  ),
  (
    '02', 'Portré & Stúdió', 'Portrait & Studio',
    'Stúdió- és outdoor portrék. Természetes és konceptuális megközelítéssel, professzionális retussal.',
    'Studio and outdoor portraits. Natural and conceptual approaches with professional retouching.',
    2
  ),
  (
    '03', 'Videóklipp', 'Music Video',
    'Zenészeknek és előadóknak. Helyszíni forgatás, vágás, color grading. Egyedi vizuális nyelv minden projekthez.',
    'For musicians and performers. On-location shooting, editing, color grading. A unique visual language for every project.',
    3
  )
) as v(number, name_hu, name_en, desc_hu, desc_en, sort_order)
where not exists (
  select 1 from public.services s where s.number = v.number
);


-- ============================================================================
-- 5. SITE_CONTENT — Hero / Rólam szövegek
-- ============================================================================

create table if not exists public.site_content (
  key   text primary key,
  value text not null
);

alter table public.site_content enable row level security;

drop policy if exists "Public read content" on public.site_content;
drop policy if exists "Admin all content"   on public.site_content;

create policy "Public read content"
  on public.site_content for select
  using (true);

create policy "Admin all content"
  on public.site_content for all
  using (auth.role() = 'authenticated');

insert into public.site_content (key, value) values
  ('hero_line1_hu',    'Ahol a fény'),
  ('hero_line2_hu',    'meghal.'),
  ('hero_subtitle_hu', 'Rendezvények, underground helyszínek, portrék és urbex — a képek, amelyek megmaradnak.'),
  ('hero_cta_hu',      'Portfólió megtekintése'),
  ('hero_line1_en',    'Where the light'),
  ('hero_line2_en',    'dies.'),
  ('hero_subtitle_en', 'Events, underground venues, portraits and urbex — images that stay with you.'),
  ('hero_cta_en',      'View Portfolio'),
  ('about_bio1_hu',    'Budapesti fotós és videós vagyok, aki bulik, rendezvények és underground helyszínek dokumentálására specializálódott. Az Arsenal, a Lärm és a hasonló helyek a természetes közegem.'),
  ('about_bio2_hu',    'Kezdő videoklipp-forgató – hiszek abban, hogy a mozgókép ugyanolyan nyers igazságot tud mutatni, mint egy jó állókép. Portrékon, urbex helyszíneken és utcán is otthon vagyok.'),
  ('about_bio3_hu',    'Nem szépítem az életet. Megmutatom, ahogy van.'),
  ('about_bio1_en',    'Budapest-based photographer and videographer specializing in parties, events and underground venues. Arsenal, Lärm and similar places are my natural habitat.'),
  ('about_bio2_en',    'Aspiring music video director – I believe moving image can carry the same raw truth as a still. I also shoot portraits, urbex locations and street.'),
  ('about_bio3_en',    'I don''t beautify life. I show it as it is.')
on conflict (key) do nothing;


-- ============================================================================
-- 6. CUSTOM_SECTIONS — böngészőből szerkeszthető egyedi tartalmi szekciók
-- ============================================================================

create table if not exists public.custom_sections (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  title_hu    text not null default '',
  title_en    text not null default '',
  body_hu     text not null default '',
  body_en     text not null default '',
  align       text not null default 'left'
    check (align in ('left','center-left','center','center-right','right')),
  line_height text not null default '1.75'
    check (line_height in ('1.4','1.6','1.75','2.0','2.4')),
  font_size   text not null default 'normal'
    check (font_size in ('small','normal','large')),
  visible     boolean not null default true,
  sort_order  int not null default 0
);

-- v8b bővítés: cím és body külön igazítás + extra mezők
alter table public.custom_sections
  add column if not exists title_align text not null default 'left'
    check (title_align in ('left','center-left','center','center-right','right'));

alter table public.custom_sections
  add column if not exists body_align text not null default 'left'
    check (body_align in ('left','center-left','center','center-right','right'));

alter table public.custom_sections
  add column if not exists fields jsonb not null default '[]'::jsonb;

alter table public.custom_sections enable row level security;

drop policy if exists "Public read sections" on public.custom_sections;
drop policy if exists "Admin all sections"   on public.custom_sections;

create policy "Public read sections"
  on public.custom_sections for select
  using (true);

create policy "Admin all sections"
  on public.custom_sections for all
  using (auth.role() = 'authenticated');


-- ============================================================================
-- 7. STORAGE — "attachments" bucket a Contact form fájlcsatolásaihoz
-- ============================================================================

insert into storage.buckets (id, name, public)
  values ('attachments', 'attachments', true)
  on conflict (id) do nothing;

drop policy if exists "Public upload attachments" on storage.objects;
drop policy if exists "Public read attachments"   on storage.objects;
drop policy if exists "Admin delete attachments"  on storage.objects;

create policy "Public upload attachments"
  on storage.objects for insert
  with check (bucket_id = 'attachments');

create policy "Public read attachments"
  on storage.objects for select
  using (bucket_id = 'attachments');

create policy "Admin delete attachments"
  on storage.objects for delete
  using (bucket_id = 'attachments' and auth.role() = 'authenticated');


-- ============================================================================
-- VÉGE — táblák és storage bucketek összesítése
-- ============================================================================
-- Táblák:            messages, portfolio_categories, portfolio_items,
--                     services, site_content, custom_sections
-- Storage bucketek:   attachments (public)
-- RLS:                minden táblán bekapcsolva
-- Idempotens:         igen — újrafuttatva nem változtat semmin
-- ============================================================================
