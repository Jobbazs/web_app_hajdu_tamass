-- ============================================================================
-- NOX PORTFOLIO APP — TELJES SQL SÉMA (idempotens)
-- Tartalmazza az alap portfólió sémát + az időpontfoglalás rendszert
-- Supabase Dashboard → SQL Editor → New query → Paste → Run
-- ============================================================================


-- ============================================================================
-- 1. MESSAGES
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
  on public.messages for insert with check (true);
create policy "Admin select messages"
  on public.messages for select using (auth.role() = 'authenticated');
create policy "Admin update messages"
  on public.messages for update using (auth.role() = 'authenticated');
create policy "Admin delete messages"
  on public.messages for delete using (auth.role() = 'authenticated');


-- ============================================================================
-- 2. PORTFOLIO_CATEGORIES
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
  on public.portfolio_categories for select using (true);
create policy "Admin all categories"
  on public.portfolio_categories for all using (auth.role() = 'authenticated');

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
-- 3. PORTFOLIO_ITEMS
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
  on public.portfolio_items for select using (true);
create policy "Admin all portfolio"
  on public.portfolio_items for all using (auth.role() = 'authenticated');


-- ============================================================================
-- 4. SERVICES
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
  on public.services for select using (true);
create policy "Admin all services"
  on public.services for all using (auth.role() = 'authenticated');

insert into public.services (number, name_hu, name_en, desc_hu, desc_en, sort_order)
select v.number, v.name_hu, v.name_en, v.desc_hu, v.desc_en, v.sort_order
from (values
  ('01','Rendezvény & Buli','Event & Party',
   'Bulik, rávek, underground partik dokumentálása. Teljes éjszakás jelenlét, szerkesztett képsorozat leadás másnapra.',
   'Parties, raves, underground events. Full-night coverage with edited photo sets delivered the next day.',1),
  ('02','Portré & Stúdió','Portrait & Studio',
   'Stúdió- és outdoor portrék. Természetes és konceptuális megközelítéssel, professzionális retussal.',
   'Studio and outdoor portraits. Natural and conceptual approaches with professional retouching.',2),
  ('03','Videóklipp','Music Video',
   'Zenészeknek és előadóknak. Helyszíni forgatás, vágás, color grading. Egyedi vizuális nyelv minden projekthez.',
   'For musicians and performers. On-location shooting, editing, color grading. A unique visual language for every project.',3)
) as v(number,name_hu,name_en,desc_hu,desc_en,sort_order)
where not exists (select 1 from public.services s where s.number = v.number);


-- ============================================================================
-- 5. SITE_CONTENT
-- ============================================================================

create table if not exists public.site_content (
  key   text primary key,
  value text not null
);

alter table public.site_content enable row level security;

drop policy if exists "Public read content" on public.site_content;
drop policy if exists "Admin all content"   on public.site_content;

create policy "Public read content"
  on public.site_content for select using (true);
create policy "Admin all content"
  on public.site_content for all using (auth.role() = 'authenticated');

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
  ('about_bio3_en',    'I don''t beautify life. I show it as it is.'),
  ('about_portrait_url', ''),
  ('footer_socials',   '[{"label":"Instagram","url":""},{"label":"TikTok","url":""},{"label":"Behance","url":""}]')
on conflict (key) do nothing;


-- ============================================================================
-- 6. CUSTOM_SECTIONS
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
  on public.custom_sections for select using (true);
create policy "Admin all sections"
  on public.custom_sections for all using (auth.role() = 'authenticated');


-- ============================================================================
-- 7. STORAGE — attachments bucket
-- ============================================================================

insert into storage.buckets (id, name, public)
  values ('attachments', 'attachments', true)
  on conflict (id) do nothing;

-- Feltöltési méret-limit: 10 MB / fájl (a publikus feltöltés így nem
-- használható a tárhely teleszemetelésére óriásfájlokkal). Csak a méretet
-- korlátozza, a fájltípust nem – így meglévő feltöltések nem törnek el.
update storage.buckets
  set file_size_limit = 10485760   -- 10 MB
  where id = 'attachments';

drop policy if exists "Public upload attachments" on storage.objects;
drop policy if exists "Public read attachments"   on storage.objects;
drop policy if exists "Admin delete attachments"  on storage.objects;

create policy "Public upload attachments"
  on storage.objects for insert with check (bucket_id = 'attachments');
create policy "Public read attachments"
  on storage.objects for select using (bucket_id = 'attachments');
create policy "Admin delete attachments"
  on storage.objects for delete
  using (bucket_id = 'attachments' and auth.role() = 'authenticated');


-- ============================================================================
-- 8. IDŐPONTFOGLALÁS — appointment booking system
-- ============================================================================

-- ── 8a. Foglalható időblokkok (admin hozza létre / generálja) ──────────────

create table if not exists public.appointment_slots (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),

  -- Megjelenítési adatok
  title            text not null,                    -- pl. "Portré fotózás"
  description      text,                             -- opcionális leírás kliensnek
  service_type     text not null,                    -- pl. 'portrait', 'event', 'video'

  -- Időpont
  slot_date        date not null,
  start_time       time not null,
  end_time         time not null,

  -- Kapacitás (1 az alapértelmezett, de növelhető pl. workshophoz)
  capacity         int not null default 1,
  booked_count     int not null default 0,

  -- Ismétlődés (rrule string, pl. 'FREQ=WEEKLY;BYDAY=MO')
  -- null = egyszeri időpont
  is_recurring     boolean not null default false,
  recurrence_rule  text,
  recurrence_end   date,                             -- meddig generálódjon

  -- Láthatóság
  visible          boolean not null default true
);

-- A booked_count > capacity (túlfoglalás) MEGENGEDETT, hogy a valós szám
-- mindig látszódjon. A régi CHECK constraint hibát dobna az újraszámoló
-- triggernél / visszatöltésnél, ezért eltávolítjuk. A "betelt" állapotot a
-- frontend a booked_count >= capacity összehasonlítással kezeli.
alter table public.appointment_slots
  drop constraint if exists booked_not_exceed_capacity;

alter table public.appointment_slots enable row level security;

drop policy if exists "Public read slots" on public.appointment_slots;
drop policy if exists "Admin all slots"   on public.appointment_slots;

create policy "Public read slots"
  on public.appointment_slots for select
  using (visible = true);
create policy "Admin all slots"
  on public.appointment_slots for all
  using (auth.role() = 'authenticated');


-- ── 8b. Foglalások ────────────────────────────────────────────────────────

create table if not exists public.appointments (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),

  -- Melyik időblokhoz tartozik
  slot_id               uuid not null references public.appointment_slots(id) on delete cascade,

  -- Kliens adatok
  name                  text not null,
  email                 text not null,
  phone                 text,
  message               text,                        -- korlátlan hossz (text típus)

  -- Státusz
  -- pending_confirmation → confirmed → approved → completed | cancelled | no_show
  status                text not null default 'pending_confirmation'
    check (status in (
      'pending_confirmation',   -- email megerősítésre vár
      'confirmed',              -- kliens megerősítette emailben
      'approved',               -- admin jóváhagyta (automatikus)
      'completed',              -- megtörtént
      'cancelled',              -- lemondva
      'no_show'                 -- nem jelent meg
    )),

  -- Email megerősítő token
  confirmation_token    text unique,
  token_expires_at      timestamptz,
  confirmed_at          timestamptz,
  approved_at           timestamptz,

  -- Lemondási token (kliens saját magát mondhatja le)
  cancellation_token    text unique,

  -- Megjegyzés adminnak
  admin_notes           text
);

alter table public.appointments enable row level security;

drop policy if exists "Public insert appointments"  on public.appointments;
drop policy if exists "Public confirm appointment"  on public.appointments;
drop policy if exists "Public update by token"      on public.appointments;
drop policy if exists "Admin all appointments"      on public.appointments;

-- Bárki FOGLALHAT, de CSAK megerősítésre váró státusszal.
-- (Így nem lehet közvetlenül 'confirmed' foglalást beszúrni a megerősítés
--  kikerülésével. A várólista-elfogadás confirmed foglalását a
--  respond_waitlist RPC hozza létre, ami SECURITY DEFINER → megkerüli ezt.)
create policy "Public insert appointments"
  on public.appointments for insert
  with check (status = 'pending_confirmation');

-- FIGYELEM – SZÁNDÉKOSAN NINCS publikus SELECT és UPDATE policy.
-- Korábban a "Public confirm appointment" (using true) MINDEN foglalást
-- olvashatóvá tett (PII + tokenek), a "Public update by token" pedig
-- token ismerete nélkül is engedte a lemondást/megerősítést.
-- Helyettük token-scope-olt SECURITY DEFINER RPC-k állnak (lásd 8h szekció):
--   confirm_appointment(token), cancel_appointment(token), respond_waitlist(token, accept)
-- Az anonim kliens így csak beszúrni tud (fent), olvasni/módosítani nem.

-- Admin mindent lát és módosíthat
create policy "Admin all appointments"
  on public.appointments for all
  using (auth.role() = 'authenticated');


-- ── 8c. Várólisták ────────────────────────────────────────────────────────

create table if not exists public.appointment_waitlist (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  slot_id         uuid not null references public.appointment_slots(id) on delete cascade,

  name            text not null,
  email           text not null,
  phone           text,

  -- Mikor küldtük az értesítő emailt
  notified_at     timestamptz,

  -- Elfogadta / elutasította a felajánlott helyet
  -- null = még nem értesítettük / vár
  -- 'accepted' = elfogadta, appointment létrejött
  -- 'declined' = elutasította, következő kap értesítést
  response        text check (response in ('accepted', 'declined')),
  responded_at    timestamptz,

  -- Token az elfogad/elutasít linkekhez
  offer_token     text unique,
  offer_expires_at timestamptz,

  -- Sorrend a várólistán
  position        int not null default 0
);

alter table public.appointment_waitlist enable row level security;

drop policy if exists "Public join waitlist"  on public.appointment_waitlist;
drop policy if exists "Public read waitlist"  on public.appointment_waitlist;
drop policy if exists "Admin all waitlist"    on public.appointment_waitlist;

-- Bárki feliratkozhat, de csak "friss" sorral: nem állíthat be magának
-- értesítést / ajánlat-tokent / választ. A position-t trigger tölti ki (8h).
create policy "Public join waitlist"
  on public.appointment_waitlist for insert
  with check (
    response is null
    and notified_at is null
    and offer_token is null
  );
-- SZÁNDÉKOSAN NINCS publikus SELECT: korábban a "Public read waitlist"
-- (using true) minden várólistás nevét/emailjét/offer_token-jét kiadta.
-- Az elfogadás/elutasítás a respond_waitlist RPC-n megy (8h).
create policy "Admin all waitlist"
  on public.appointment_waitlist for all using (auth.role() = 'authenticated');


-- ── 8d. Kliens megbízhatósági lista ────────────────────────────────────────

create table if not exists public.client_reliability (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Azonosítók (email az elsődleges)
  email             text not null unique,
  name              text,
  phone             text,

  -- Megbízhatósági szint
  -- 0 = tiszta (új kliens)
  -- 1 = warning: nem erősítette meg az emailt
  -- 2 = warning: visszaigazolta, de lemondta 24h-n belül
  -- 3 = piros: megjelent a naptárban, de nem jött el (no-show)
  -- 4 = manuálisan blokkolt (a rendszer nem fogad el tőle foglalást)
  reliability_level int not null default 0
    check (reliability_level between 0 and 4),

  -- Számláló mezők (automatikusan nőnek)
  unconfirmed_count int not null default 0,   -- meg nem erősített foglalások
  late_cancel_count int not null default 0,   -- 24h-n belüli lemondások
  no_show_count     int not null default 0,   -- meg nem jelent foglalások

  -- Manuális megjegyzés (admin írja)
  notes             text,

  -- Utolsó incidens időpontja
  last_incident_at  timestamptz
);

alter table public.client_reliability enable row level security;

drop policy if exists "Admin all reliability" on public.client_reliability;

-- Csak admin látja és kezeli
create policy "Admin all reliability"
  on public.client_reliability for all
  using (auth.role() = 'authenticated');


-- ── 8e. Trigger: updated_at automatikus frissítése ──────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_reliability on public.client_reliability;
create trigger set_updated_at_reliability
  before update on public.client_reliability
  for each row execute function public.set_updated_at();


-- ── 8f. Trigger: booked_count automatikus karbantartása ──────────────────
--
--  EGYETLEN forrás az igazsághoz. A korábbi inkrementális triggert
--  (update_slot_booked_count / trg_update_booked_count) SZÁNDÉKOSAN
--  eltávolítjuk, mert:
--    • nem SECURITY DEFINER volt → anonim (kliens) confirm-nál az
--      appointment_slots UPDATE-et az RLS csendben eldobta → a szám
--      sosem frissült,
--    • ha együtt futott az újraszámolóval, dupláztak.
--
--  Az új függvény ABSZOLÚT értékre számol (mindig helyre áll), és
--  SECURITY DEFINER, így az RLS-t megkerülve tud írni a slot-táblába.
--  Aktívnak a 'confirmed' / 'approved' / 'completed' státusz számít
--  (a 'pending_confirmation' nem foglal helyet, az eredeti szándék szerint).

-- Régi trigger + függvény takarítása
drop trigger  if exists trg_update_booked_count on public.appointments;
drop function if exists public.update_slot_booked_count();

create or replace function public.recalc_slot_booked_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected uuid;
begin
  affected := coalesce(new.slot_id, old.slot_id);
  if affected is null then
    return null;
  end if;

  update public.appointment_slots s
  set booked_count = (
    select count(*)
    from public.appointments a
    where a.slot_id = affected
      and a.status in ('confirmed', 'approved', 'completed')
  )
  where s.id = affected;

  return null; -- AFTER trigger
end;
$$;

-- A név '00'-val kezdődik, hogy ALFABÉTIKUSAN korán fusson, így a
-- booked_count minden más appointments-triggernél előbb frissül.
drop trigger if exists trg_recalc_booked_count on public.appointments;
drop trigger if exists trg_00_recalc_booked_count on public.appointments;
create trigger trg_00_recalc_booked_count
  after insert or update or delete on public.appointments
  for each row execute function public.recalc_slot_booked_count();

-- Egyszeri visszatöltés: a MOSTANI állapotot azonnal korrigálja
update public.appointment_slots s
set booked_count = coalesce((
  select count(*)
  from public.appointments a
  where a.slot_id = s.id
    and a.status in ('confirmed', 'approved', 'completed')
), 0);


-- ── 8g. View: szabad helyek publikus nézete ──────────────────────────────

create or replace view public.available_slots
  with (security_invoker = true)   -- RLS-t az alaptáblán alkalmazza, nem kerüli meg
as
  select
    s.id,
    s.title,
    s.description,
    s.service_type,
    s.slot_date,
    s.start_time,
    s.end_time,
    s.capacity,
    s.booked_count,
    (s.capacity - s.booked_count) as available_spots
  from public.appointment_slots s
  where s.visible = true
    and s.slot_date >= current_date
  -- A betelt időpontok SZÁNDÉKOSAN bennmaradnak: a látogató lássa hogy
  -- betelt, és fel tudjon iratkozni a várólistára. A szűrést a frontend
  -- végzi (booked_count >= capacity -> várólistás ág).
  order by s.slot_date, s.start_time;


-- ── 8h. BIZTONSÁG: token-scope-olt RPC-k a publikus műveletekhez ──────────
--
--  Ezek váltják ki a korábbi, túl megengedő publikus SELECT/UPDATE policy-kat.
--  Mindegyik SECURITY DEFINER (a tulajdonos jogaival fut, megkerüli az RLS-t),
--  DE csak egy konkrét, token alapján beazonosított sorra hat, és semmilyen
--  más adatot nem ad vissza – csak egy státusz-stringet. A search_path
--  rögzítve van (search_path hijack ellen).

-- Megerősítés: a confirmation_token-hez tartozó foglalást 'confirmed'-re állítja
create or replace function public.confirm_appointment(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  if p_token is null or length(p_token) < 10 then return 'error'; end if;

  select id, status, token_expires_at
    into r
    from public.appointments
    where confirmation_token = p_token;

  if not found then return 'error'; end if;
  if r.status <> 'pending_confirmation' then return 'confirmed'; end if; -- már megerősítve
  if r.token_expires_at is not null and r.token_expires_at < now() then return 'expired'; end if;

  update public.appointments
    set status = 'confirmed', confirmed_at = now()
    where id = r.id;

  return 'confirmed';
end;
$$;

-- Lemondás: a cancellation_token-hez tartozó foglalást 'cancelled'-re állítja
-- (a recalc + waitlist trigger emiatt lefut → hely felszabadul, következő értesül)
create or replace function public.cancel_appointment(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  if p_token is null or length(p_token) < 10 then return 'error'; end if;

  select id, status
    into r
    from public.appointments
    where cancellation_token = p_token;

  if not found then return 'error'; end if;
  if r.status = 'cancelled' then return 'cancelled'; end if;

  update public.appointments
    set status = 'cancelled'
    where id = r.id;

  return 'cancelled';
end;
$$;

-- Várólista-ajánlat elfogadása / elutasítása offer_token alapján
create or replace function public.respond_waitlist(p_token text, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
  v_cancel_token text;
begin
  if p_token is null or length(p_token) < 10 then return 'error'; end if;

  select * into w
    from public.appointment_waitlist
    where offer_token = p_token;

  if not found then return 'expired'; end if;
  if w.offer_expires_at is not null and w.offer_expires_at < now() then return 'expired'; end if;
  if w.response is not null then
    return case when w.response = 'accepted' then 'waitlist_accepted' else 'waitlist_declined' end;
  end if;

  if p_accept then
    v_cancel_token := gen_random_uuid()::text;
    insert into public.appointments
      (slot_id, name, email, phone, status, confirmed_at, cancellation_token)
    values
      (w.slot_id, w.name, w.email, w.phone, 'confirmed', now(), v_cancel_token);

    update public.appointment_waitlist
      set response = 'accepted', responded_at = now()
      where id = w.id;

    return 'waitlist_accepted';
  else
    update public.appointment_waitlist
      set response = 'declined', responded_at = now()
      where id = w.id;
    -- A következő várakozót a waitlist-tick értesíti a következő futáskor
    -- (a slot most szabad kapacitású lett).
    return 'waitlist_declined';
  end if;
end;
$$;

-- A publikus (anon) kliens hívhatja ezeket; más táblaműveletet nem
grant execute on function public.confirm_appointment(text) to anon, authenticated;
grant execute on function public.cancel_appointment(text)  to anon, authenticated;
grant execute on function public.respond_waitlist(text, boolean) to anon, authenticated;

-- Várólista pozíció szerveroldali kiosztása (a kliensnek nem kell a táblát
-- olvasnia hozzá – így a publikus SELECT megszüntethető volt)
create or replace function public.set_waitlist_position()
returns trigger
language plpgsql
as $$
begin
  if new.position is null or new.position = 0 then
    select coalesce(max(position), 0) + 1
      into new.position
      from public.appointment_waitlist
      where slot_id = new.slot_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_waitlist_position on public.appointment_waitlist;
create trigger trg_set_waitlist_position
  before insert on public.appointment_waitlist
  for each row execute function public.set_waitlist_position();


-- ── 8i. RATE LIMIT: egyszerű, email-alapú spam-fék ───────────────────────
--
--  DB-szintű "lágy" limit: ugyanarról az email-címről óránként legfeljebb
--  MAX_PER_HOUR publikus foglalás ill. kontakt-üzenet. Kódmentes a
--  frontenden. FIGYELEM: ez EMAIL-alapú (nem IP), tehát változó címmel
--  megkerülhető – a durva, ismétlődő spamet fogja meg. Erősebb védelemhez
--  IP-szintű limit kell (pl. Cloudflare a domain elé), ami a szerver előtt
--  szűr. A limit értéke bőven a normál használat felett van; tuningolható.

-- Publikus foglalás-spam (csak a pending_confirmation ágra; az admin- és a
-- várólista-elfogadás confirmed insertjeit NEM érinti)
create or replace function public.rate_limit_appointments()
returns trigger
language plpgsql
as $$
declare
  cnt int;
  max_per_hour constant int := 5;
begin
  if new.status = 'pending_confirmation' and new.email is not null then
    select count(*) into cnt
      from public.appointments
      where lower(email) = lower(new.email)
        and created_at > now() - interval '1 hour';
    if cnt >= max_per_hour then
      raise exception 'RATE_LIMIT: tul sok foglalasi kiserlet errol az email cimrol, probald ujra kesobb'
        using errcode = '53400';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rate_limit_appointments on public.appointments;
create trigger trg_rate_limit_appointments
  before insert on public.appointments
  for each row execute function public.rate_limit_appointments();

-- Kontakt-űrlap spam (a rendszer által beszúrt waitlist_notification sorokat
-- kihagyja, hogy a várólista-értesítés soha ne akadjon el)
create or replace function public.rate_limit_messages()
returns trigger
language plpgsql
as $$
declare
  cnt int;
  max_per_hour constant int := 5;
begin
  if (new.service is distinct from 'waitlist_notification') and new.email is not null then
    select count(*) into cnt
      from public.messages
      where lower(email) = lower(new.email)
        and (service is distinct from 'waitlist_notification')
        and created_at > now() - interval '1 hour';
    if cnt >= max_per_hour then
      raise exception 'RATE_LIMIT: tul sok uzenet errol az email cimrol, probald ujra kesobb'
        using errcode = '53400';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rate_limit_messages on public.messages;
create trigger trg_rate_limit_messages
  before insert on public.messages
  for each row execute function public.rate_limit_messages();


-- ============================================================================
-- 9. VÁRÓLISTA MOTOR — a waitlist-tick Edge Function felel érte
-- ============================================================================
--
-- A korábbi DB-trigger alapú értesítés (notify_next_waitlist /
-- notify_next_on_decline) meg lett szüntetve: az csak beállította a
-- következő várakozónak az offer-tokent, de emailt NEM küldött (azt egy
-- sosem feldolgozott messages-sor "küldte" volna), így a lánc első embere
-- csendben kimaradt.
--
-- Helyette a teljes logikát a `waitlist-tick` Edge Function végzi, amely
-- ESEMÉNY-AGNOSZTIKUS: percenként (pg_cron) újraszámolja az állapotot, és
-- MINDEN szabad kapacitású, mai/jövőbeli slotra értesíti a soron következő
-- várakozó(ka)t – függetlenül attól, mi szabadította fel a helyet
-- (lemondás, no-show, elutasítás, lejárat).
--
-- A régi triggerek/függvények eldobása (idempotens; meglévő DB-t is tisztít):
drop trigger  if exists trg_notify_waitlist         on public.appointments;
drop trigger  if exists trg_notify_waitlist_decline on public.appointment_waitlist;
drop function if exists public.notify_next_waitlist();
drop function if exists public.notify_next_on_decline();

-- A waitlist-tick pg_cron ütemezését NEM itt állítjuk be, mert tartalmazza a
-- CRON_SECRET-et és a projekt URL-t (nem való publikus repóba). A beállító
-- parancsot külön, egyszeri futtatásra add ki (lásd a kísérő dokumentációt).


-- ============================================================================
-- 10. REALTIME — élő frissítés engedélyezése a szükséges táblákra
-- A frontend hookok postgres_changes eseményekre iratkoznak fel; ez a blokk
-- adja hozzá a táblákat a supabase_realtime publikációhoz. Idempotens.
-- A Realtime tiszteletben tartja az RLS-t: anonim kliens csak azt kapja meg,
-- amit amúgy is olvashat (a publikus foglalás-oldal csak az appointment_slots-ra
-- iratkozik fel → nem szivárog PII a realtime csatornán).
-- ============================================================================

-- Publikáció létrehozása, ha egy tiszta (nem Supabase-managed) telepítésen
-- még nem létezne
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
declare
  t text;
  tables text[] := array[
    'appointment_slots',   -- publikus: booked_count itt frissül (nincs PII)
    'appointments',        -- admin: foglaláslista élő frissítés
    'appointment_waitlist',
    'client_reliability',
    'portfolio_items',
    'portfolio_categories',
    'services',
    'site_content',
    'custom_sections'
  ];
begin
  foreach t in array tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ============================================================================
-- 11. PG_CRON — régi foglalások automatikus törlése
-- Előfeltétel: Supabase Dashboard → Database → Extensions → pg_cron → Enable
-- Ez a blokk kihagyható ha nem kell automatikus takarítás.
-- ============================================================================

-- Extension engedélyezése (ha még nem fut)
create extension if not exists pg_cron;

-- Hetente egyszer (minden vasárnap 02:00 UTC) töröl minden olyan foglalást
-- amelynek az időpontja legalább 1 hete volt (slot_date + 7 nap < ma)
select cron.schedule(
  'delete-old-appointments',          -- job neve (egyedi, módosítható)
  '0 2 * * 0',                        -- cron expr: vasárnap 02:00 UTC
  $$
    delete from public.appointments a
    using public.appointment_slots s
    where a.slot_id = s.id
      and s.slot_date < (current_date - interval '7 days');
  $$
);

-- Opcionális: régi waitlist bejegyzések törlése is (ugyanolyan logika)
select cron.schedule(
  'delete-old-waitlist',
  '0 2 * * 0',
  $$
    delete from public.appointment_waitlist w
    using public.appointment_slots s
    where w.slot_id = s.id
      and s.slot_date < (current_date - interval '7 days');
  $$
);

-- Régi, lejárt slot-ok törlése (ha a slot_date > 30 napja múlt el)
-- Ez opcionális – ha meg akarod tartani a historikus slot adatokat, hagyd ki
select cron.schedule(
  'delete-old-slots',
  '0 3 * * 0',
  $$
    delete from public.appointment_slots
    where slot_date < (current_date - interval '30 days');
  $$
);

-- ── Ellenőrzés ──────────────────────────────────────────────
-- A beütemezett job-ok listája:
-- select * from cron.job;
--
-- Job törlése ha nem kell:
-- select cron.unschedule('delete-old-appointments');
-- select cron.unschedule('delete-old-waitlist');
-- select cron.unschedule('delete-old-slots');


-- ============================================================================
-- VÉGE
-- Táblák:   messages, portfolio_categories, portfolio_items, services,
--           site_content, custom_sections, appointment_slots, appointments,
--           appointment_waitlist, client_reliability
-- View:     available_slots
-- RPC:      confirm_appointment, cancel_appointment, respond_waitlist
--           (SECURITY DEFINER, token-scope-olt publikus műveletek)
-- Trigger:  set_updated_at_reliability, trg_00_recalc_booked_count,
--           trg_set_waitlist_position,
--           trg_rate_limit_appointments, trg_rate_limit_messages
-- Motor:    waitlist-tick Edge Function (várólista értesítés, pg_cron)
-- Realtime: appointment_slots, appointments, appointment_waitlist,
--           client_reliability, portfolio_items, portfolio_categories,
--           services, site_content, custom_sections
-- Storage:  attachments (public bucket)
-- Cron:     delete-old-appointments, delete-old-waitlist, delete-old-slots
-- ============================================================================
