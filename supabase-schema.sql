-- ============================================================
-- PORTFOLIO APP – Teljes Supabase Schema
-- Supabase Dashboard → SQL Editor → New query → Paste → Run
-- ============================================================


-- ── 1. MESSAGES (contact form üzenetek) ─────────────────────

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  service     text,
  message     text not null,
  read        boolean not null default false
);

alter table public.messages enable row level security;

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


-- ── 2. PORTFOLIO_ITEMS ───────────────────────────────────────

create table public.portfolio_items (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  title           text not null,
  category        text not null check (category in ('event','portrait','video','urbex')),
  cloudinary_url  text not null,
  video_url       text,
  span            text not null default 'medium' check (span in ('large','medium','small')),
  sort_order      int not null default 0,
  visible         boolean not null default true
);

alter table public.portfolio_items enable row level security;

create policy "Public read portfolio"
  on public.portfolio_items for select
  using (true);

create policy "Admin all portfolio"
  on public.portfolio_items for all
  using (auth.role() = 'authenticated');


-- ── 3. SERVICES ──────────────────────────────────────────────

create table public.services (
  id          uuid primary key default gen_random_uuid(),
  number      text not null,
  name_hu     text not null,
  name_en     text not null,
  desc_hu     text not null,
  desc_en     text not null,
  sort_order  int not null default 0
);

alter table public.services enable row level security;

create policy "Public read services"
  on public.services for select
  using (true);

create policy "Admin all services"
  on public.services for all
  using (auth.role() = 'authenticated');


-- ── 4. SITE_CONTENT (hero, about szövegek) ──────────────────

create table public.site_content (
  key    text primary key,
  value  text not null
);

alter table public.site_content enable row level security;

create policy "Public read content"
  on public.site_content for select
  using (true);

create policy "Admin all content"
  on public.site_content for all
  using (auth.role() = 'authenticated');


-- ============================================================
-- KEZDETI ADATOK – egyszer kell futtatni
-- ============================================================

-- Szolgáltatások
insert into public.services (number, name_hu, name_en, desc_hu, desc_en, sort_order) values
(
  '01',
  'Rendezvény & Buli',
  'Event & Party',
  'Bulik, rávek, underground partik dokumentálása. Teljes éjszakás jelenlét, szerkesztett képsorozat leadás másnapra.',
  'Parties, raves, underground events. Full-night coverage with edited photo sets delivered the next day.',
  1
),
(
  '02',
  'Portré & Stúdió',
  'Portrait & Studio',
  'Stúdió- és outdoor portrék. Természetes és konceptuális megközelítéssel, professzionális retussal.',
  'Studio and outdoor portraits. Natural and conceptual approaches with professional retouching.',
  2
),
(
  '03',
  'Videóklipp',
  'Music Video',
  'Zenészeknek és előadóknak. Helyszíni forgatás, vágás, color grading. Egyedi vizuális nyelv minden projekthez.',
  'For musicians and performers. On-location shooting, editing, color grading. A unique visual language for every project.',
  3
);

-- Oldal tartalom (hero + about)
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
('about_bio3_en',    'I don''t beautify life. I show it as it is.');
