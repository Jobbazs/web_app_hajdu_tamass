
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

create policy "Admin select messages"
  on public.messages for select using (auth.role() = 'authenticated');
create policy "Admin update messages"
  on public.messages for update using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');
create policy "Admin delete messages"
  on public.messages for delete using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');


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
  on public.portfolio_categories for all
  using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo')
  with check (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');


create table if not exists public.portfolio_items (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  title          text not null,
  category_id    uuid references public.portfolio_categories(id) on delete set null,
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
  on public.portfolio_items for all
  using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo')
  with check (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');

create or replace function public.portfolio_categories_autoorder()
returns trigger language plpgsql as $$
begin
  select coalesce(max(sort_order), 0) + 1 into new.sort_order
    from public.portfolio_categories;
  return new;
end $$;
drop trigger if exists trg_pc_autoorder on public.portfolio_categories;
create trigger trg_pc_autoorder
  before insert on public.portfolio_categories
  for each row execute function public.portfolio_categories_autoorder();

create or replace function public.portfolio_categories_recompact()
returns trigger language plpgsql as $$
begin
  with ranked as (
    select id, row_number() over (order by sort_order, label_hu) as rn
      from public.portfolio_categories
  )
  update public.portfolio_categories p
     set sort_order = r.rn
    from ranked r
   where p.id = r.id and p.sort_order is distinct from r.rn;
  return null;
end $$;
drop trigger if exists trg_pc_recompact on public.portfolio_categories;
create trigger trg_pc_recompact
  after delete on public.portfolio_categories
  for each statement execute function public.portfolio_categories_recompact();

drop trigger if exists trg_pc_del_items on public.portfolio_categories;
drop function if exists public.portfolio_categories_del_items();
do $$
declare
  fk_name text;
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='portfolio_items' and column_name='category_id'
  ) then
    alter table public.portfolio_items alter column category_id drop not null;
    select con.conname into fk_name
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
     where rel.relname='portfolio_items' and con.contype='f'
       and con.confrelid = 'public.portfolio_categories'::regclass
     limit 1;
    if fk_name is not null then
      execute format('alter table public.portfolio_items drop constraint %I', fk_name);
    end if;
    alter table public.portfolio_items
      add constraint portfolio_items_category_id_fkey
      foreign key (category_id) references public.portfolio_categories(id) on delete set null;
  end if;
end $$;

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
  on public.services for all
  using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo')
  with check (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');

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
  on public.site_content for all
  using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo')
  with check (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');

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
  on public.custom_sections for all
  using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo')
  with check (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');


insert into storage.buckets (id, name, public)
  values ('attachments', 'attachments', true)
  on conflict (id) do nothing;

update storage.buckets
  set file_size_limit = 10485760
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
  using (bucket_id = 'attachments' and auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');



create table if not exists public.appointment_slots (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),

  title            text not null,
  description      text,
  service_type     text not null,

  slot_date        date not null,
  start_time       time not null,
  end_time         time not null,

  capacity         int not null default 1,
  booked_count     int not null default 0,

  is_recurring     boolean not null default false,
  recurrence_rule  text,
  recurrence_end   date,

  visible          boolean not null default true
);

alter table public.appointment_slots
  drop constraint if exists booked_not_exceed_capacity;

alter table public.appointment_slots enable row level security;

drop policy if exists "Public read slots" on public.appointment_slots;
drop policy if exists "Admin all slots"   on public.appointment_slots;
drop policy if exists "Admin read appointment_slots" on public.appointment_slots;


create policy "Public read slots"
  on public.appointment_slots for select
  using (visible = true);
create policy "Admin read appointment_slots"
  on public.appointment_slots for select using (auth.role() = 'authenticated');
create policy "Admin all slots"
  on public.appointment_slots for all
  using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo')
  with check (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');



create table if not exists public.appointments (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),

  slot_id               uuid not null references public.appointment_slots(id) on delete cascade,

  name                  text not null,
  email                 text not null,
  phone                 text,
  message               text,

  status                text not null default 'pending_confirmation'
    check (status in (
      'pending_confirmation',
      'confirmed',
      'approved',
      'completed',
      'cancelled',
      'no_show'
    )),

  confirmation_token    text unique,
  token_expires_at      timestamptz,
  confirmed_at          timestamptz,
  approved_at           timestamptz,

  cancellation_token    text unique,

  admin_notes           text
);

alter table public.appointments enable row level security;

drop policy if exists "Public insert appointments"  on public.appointments;
drop policy if exists "Public confirm appointment"  on public.appointments;
drop policy if exists "Public update by token"      on public.appointments;
drop policy if exists "Admin all appointments"      on public.appointments;
drop policy if exists "Admin read appointments"     on public.appointments;

create policy "Public insert appointments"
  on public.appointments for insert
  with check (status = 'pending_confirmation');

create policy "Admin read appointments"
  on public.appointments for select using (auth.role() = 'authenticated');
create policy "Admin all appointments"
  on public.appointments for all
  using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo')
  with check (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');



create table if not exists public.appointment_waitlist (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  slot_id         uuid not null references public.appointment_slots(id) on delete cascade,

  name            text not null,
  email           text not null,
  phone           text,

  notified_at     timestamptz,

  response        text check (response in ('accepted', 'declined')),
  responded_at    timestamptz,

  offer_token     text unique,
  offer_expires_at timestamptz,

  position        int not null default 0
);

alter table public.appointment_waitlist enable row level security;

drop policy if exists "Public join waitlist"  on public.appointment_waitlist;
drop policy if exists "Public read waitlist"  on public.appointment_waitlist;
drop policy if exists "Admin all waitlist"    on public.appointment_waitlist;
drop policy if exists "Admin read appointment_waitlist" on public.appointment_waitlist;

create policy "Public join waitlist"
  on public.appointment_waitlist for insert
  with check (
    response is null
    and notified_at is null
    and offer_token is null
  );
create policy "Admin read appointment_waitlist"
  on public.appointment_waitlist for select using (auth.role() = 'authenticated');
create policy "Admin all waitlist"
  on public.appointment_waitlist for all
  using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo')
  with check (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');



create table if not exists public.client_reliability (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  email             text not null unique,
  name              text,
  phone             text,

  reliability_level int not null default 0
    check (reliability_level between 0 and 4),

  unconfirmed_count int not null default 0,
  late_cancel_count int not null default 0,
  no_show_count     int not null default 0,

  notes             text,

  last_incident_at  timestamptz
);

alter table public.client_reliability enable row level security;

drop policy if exists "Admin all reliability" on public.client_reliability;
drop policy if exists "Admin read client_reliability" on public.client_reliability;

create policy "Admin read client_reliability"
  on public.client_reliability for select using (auth.role() = 'authenticated');
create policy "Admin all reliability"
  on public.client_reliability for all
  using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo')
  with check (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');



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

  return null;
end;
$$;

drop trigger if exists trg_recalc_booked_count on public.appointments;
drop trigger if exists trg_00_recalc_booked_count on public.appointments;
create trigger trg_00_recalc_booked_count
  after insert or update or delete on public.appointments
  for each row execute function public.recalc_slot_booked_count();

update public.appointment_slots s
set booked_count = coalesce((
  select count(*)
  from public.appointments a
  where a.slot_id = s.id
    and a.status in ('confirmed', 'approved', 'completed')
), 0);



create or replace view public.available_slots
  with (security_invoker = true)
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
  order by s.slot_date, s.start_time;
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
  if r.status <> 'pending_confirmation' then return 'confirmed'; end if;
  if r.token_expires_at is not null and r.token_expires_at < now() then return 'expired'; end if;

  update public.appointments
    set status = 'confirmed', confirmed_at = now()
    where id = r.id;

  return 'confirmed';
end;
$$;

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

drop function if exists public.respond_waitlist(text, boolean);
create or replace function public.respond_waitlist(p_token text, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
  v_cancel_token text;
begin
  if p_token is null or length(p_token) < 10 then
    return jsonb_build_object('status', 'error');
  end if;

  select * into w
    from public.appointment_waitlist
    where offer_token = p_token;

  if not found then
    return jsonb_build_object('status', 'expired');
  end if;
  if w.offer_expires_at is not null and w.offer_expires_at < now() then
    return jsonb_build_object('status', 'expired');
  end if;
  if w.response is not null then
    return jsonb_build_object(
      'status',
      case when w.response = 'accepted' then 'waitlist_accepted' else 'waitlist_declined' end
    );
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

    return jsonb_build_object('status', 'waitlist_accepted', 'cancel_token', v_cancel_token);
  else
    update public.appointment_waitlist
      set response = 'declined', responded_at = now()
      where id = w.id;

    return jsonb_build_object('status', 'waitlist_declined');
  end if;
end;
$$;

grant execute on function public.confirm_appointment(text) to anon, authenticated;
grant execute on function public.cancel_appointment(text)  to anon, authenticated;
grant execute on function public.respond_waitlist(text, boolean) to anon, authenticated;

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

drop trigger  if exists trg_notify_waitlist         on public.appointments;
drop trigger  if exists trg_notify_waitlist_decline on public.appointment_waitlist;
drop function if exists public.notify_next_waitlist();
drop function if exists public.notify_next_on_decline();

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
    'appointment_slots',
    'appointments',
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


create extension if not exists pg_cron;

select cron.schedule(
  'delete-old-appointments',
  '0 2 * * 0',
  $$
    delete from public.appointments a
    using public.appointment_slots s
    where a.slot_id = s.id
      and s.slot_date < (current_date - interval '7 days');
  $$
);

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

select cron.schedule(
  'delete-old-slots',
  '0 3 * * 0',
  $$
    delete from public.appointment_slots
    where slot_date < (current_date - interval '30 days');
  $$
);


alter table public.portfolio_categories
  add column if not exists hero_subtitle_hu   text default '',
  add column if not exists hero_subtitle_en   text default '',
  add column if not exists intro_hu           text default '',
  add column if not exists intro_en           text default '',
  add column if not exists cover_url          text,
  add column if not exists hero_align         text default 'center',
  add column if not exists hero_title_size    text default 'large',
  add column if not exists hero_subtitle_size text default 'normal',
  add column if not exists intro_align        text default 'left',
  add column if not exists intro_size         text default 'normal',
  add column if not exists hero_words         text[] default '{}';

update public.portfolio_categories set
  hero_subtitle_hu = 'Éjszakai energia, nyers pillanatok — ahogy a fény a sötétben él.',
  intro_hu = 'A budapesti éjszaka nem áll meg egy pillanatra sem, és én ezt a lüktetést kapom el. Klubok, rave-ek, underground helyszínek — az Arzenáltól a Lärmig ott vagyok, ahol a zene és a tömeg egy testté olvad. A képeim nem pózolt mosolyok: verejték, füst, fény és mozgás, pontosan úgy, ahogy megtörtént. Ha olyasvalakit keresel, aki nem kívülállóként, hanem a buli részeként dokumentálja az estét, jó helyen jársz.'
where slug = 'nightlife' and (intro_hu is null or intro_hu = '');

update public.portfolio_categories set
  hero_subtitle_hu = 'Kontrollált fény, tiszta kompozíció — a portré, ami rád hasonlít.',
  intro_hu = 'A stúdió az a hely, ahol minden rajtad múlik: a fény, a háttér, a hangulat — mind a te karaktered köré épül. Legyen szó személyes portréról, arculati fotóról vagy koncepcionális sorozatról, a célom mindig ugyanaz: olyan képet készíteni, amiben magadra ismersz. Természetes és megrendezett megközelítéssel is dolgozom, professzionális retussal, sietség nélkül. Néhány jól eltalált kép többet mond bármelyik önéletrajznál.'
where slug = 'studio' and (intro_hu is null or intro_hu = '');

update public.portfolio_categories set
  hero_subtitle_hu = 'Az est, ahogy tényleg megtörtént — minden fontos pillanattal.',
  intro_hu = 'Egy rendezvény egyszeri és megismételhetetlen — az én dolgom, hogy semmi lényeges ne vesszen el belőle. Céges eseménytől születésnapon át koncertekig végigkísérem az estét, a háttérben maradva, mégis mindenütt jelen. A hangsúly a valódi pillanatokon van: a nevetésen, a meglepetésen, a mozgáson. A szerkesztett anyagot gyorsan, akár másnapra leadom, hogy azonnal újra átélhessétek a napot.'
where slug = 'rendezveny' and (intro_hu is null or intro_hu = '');

update public.portfolio_categories set
  hero_subtitle_hu = 'Mozgás, feszültség, csúcspont — a sport és a kultúra közelről.',
  intro_hu = 'A sport és a kultúra ott a legizgalmasabb, ahol a felkészülés évei egyetlen pillanatba sűrűsödnek. Mérkőzések, fellépések, kiállítások — a gyors reakciót és a jó szemet igénylő helyzetekben vagyok otthon. Elkapom a döntő mozdulatot és a színfalak mögötti csendet is, mert egy jó képsorozat mindkettőről mesél. Dinamikus, mégis letisztult vizuális nyelv minden eseményhez.'
where slug = 'sport-kultura' and (intro_hu is null or intro_hu = '');

update public.portfolio_categories set
  hero_subtitle_hu = 'Szabad kísérletezés — ahol a koncepció találkozik a képpel.',
  intro_hu = 'Ez a tér a kísérletezésé: koncepciók, kreatív együttműködések és személyes projektek, amelyek nem férnek be egyetlen kategóriába sem. Zenészekkel, alkotókkal és márkákkal közösen építek egyedi vizuális világot — az ötlettől a végső gradinges kockáig. Ha van egy elképzelésed, amit még senki nem valósított meg, itt a helye. A határ legtöbbször csak a bátorság.'
where slug = 'kreativ' and (intro_hu is null or intro_hu = '');

update public.portfolio_categories set hero_words =
  '{éjszaka,fény,ritmus,tömeg,underground,pillanat,energia,neon,mozgás,hangulat}'
where slug = 'nightlife' and (hero_words is null or hero_words = '{}');

update public.portfolio_categories set hero_words =
  '{portré,fény,karakter,arc,kompozíció,csend,fókusz,forma,tekintet,részlet}'
where slug = 'studio' and (hero_words is null or hero_words = '{}');

update public.portfolio_categories set hero_words =
  '{élmény,pillanat,közösség,ünnep,hangulat,emlék,mozgás,öröm,találkozás,este}'
where slug = 'rendezveny' and (hero_words is null or hero_words = '{}');

update public.portfolio_categories set hero_words =
  '{mozgás,erő,csúcspont,feszültség,ritmus,szenvedély,fókusz,pillanat,küzdelem,tempó}'
where slug = 'sport-kultura' and (hero_words is null or hero_words = '{}');

update public.portfolio_categories set hero_words =
  '{koncepció,kísérlet,vízió,forma,fény,ötlet,merészség,stílus,textúra,kontraszt}'
where slug = 'kreativ' and (hero_words is null or hero_words = '{}');

create table if not exists public.category_sections (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.portfolio_categories(id) on delete cascade,
  sort_order   integer not null default 0,
  type         text not null default 'text_images',
  title_hu     text default '',
  title_en     text default '',
  body_hu      text default '',
  body_en      text default '',
  image_ids    uuid[] default '{}',
  title_align  text default 'left',
  title_size   text default 'large',
  body_align   text default 'left',
  body_size    text default 'normal',
  visible      boolean not null default true,
  created_at   timestamptz default now()
);

create index if not exists idx_category_sections_cat
  on public.category_sections (category_id, sort_order);

alter table public.category_sections enable row level security;
drop policy if exists "Public read category_sections"  on public.category_sections;
drop policy if exists "Admin all category_sections"     on public.category_sections;
create policy "Public read category_sections"
  on public.category_sections for select using (true);
create policy "Admin all category_sections"
  on public.category_sections for all
  using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo')
  with check (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'category_sections'
  ) then
    execute 'alter publication supabase_realtime add table public.category_sections';
  end if;
end $$;

create table if not exists public.rate_limits (
  id         bigint generated always as identity primary key,
  ip         text not null,
  action     text not null default 'contact',
  created_at timestamptz not null default now()
);
create index if not exists idx_rate_limits_ip_action_time
  on public.rate_limits (ip, action, created_at desc);

alter table public.rate_limits enable row level security;


update public.portfolio_categories set
  hero_subtitle_hu = coalesce(nullif(hero_subtitle_hu, ''), 'Hangulat és karakter — a fény, ami eldönti, mit érzel a képen.'),
  hero_subtitle_en = coalesce(nullif(hero_subtitle_en, ''), 'Mood and character — the light that decides how the frame feels.'),
  intro_hu = coalesce(nullif(intro_hu, ''),
    'Van, amikor nem az esemény a lényeg, hanem a hangulat, ami körülveszi. Ezek a képek erről szólnak: '
    'színek, árnyékok, textúrák és egy-egy arckifejezés, ami magában is elmond egy történetet. '
    'Szabadon dolgozom, sok kísérletezéssel — hol nyers természetes fénnyel, hol tudatosan megépített '
    'megvilágítással, mindig a téma karakteréhez igazodva. Ha olyan képsorozatot szeretnél, ami nem '
    'csak dokumentál, hanem érzetet is ad, itt jó helyen vagy.'),
  hero_words = case when hero_words is null or cardinality(hero_words) = 0
    then array['hangulat','fény','árnyék','szín','textúra','csend','karakter','pillanat']
    else hero_words end
where slug = 'mood';

update public.portfolio_categories set
  hero_subtitle_hu = coalesce(nullif(hero_subtitle_hu, ''), 'Erő, fókusz, izzadság — a munka, ami a formát adja.'),
  hero_subtitle_en = coalesce(nullif(hero_subtitle_en, ''), 'Strength, focus, sweat — the work behind the shape.'),
  intro_hu = coalesce(nullif(intro_hu, ''),
    'A konditerem nem a látszatról szól, hanem a munkáról: a nehéz sorozatok végéről, a koncentrációról '
    'és arról a pillanatról, amikor még egy ismétlés jön. Edzés közben fotózom, nem utána — így a képeken '
    'valódi erőkifejtés látszik, nem beállított póz. Sportolóknak, edzőknek és termeknek egyaránt '
    'dolgozom, legyen szó személyes portfólióról, arculati anyagról vagy közösségi tartalomról. '
    'A cél mindig ugyanaz: átjöjjön a kép mellől is, hogy mennyi van benne.'),
  hero_words = case when hero_words is null or cardinality(hero_words) = 0
    then array['erő','fókusz','ismétlés','súly','kitartás','izom','ritmus','fegyelem']
    else hero_words end
where slug = 'konditerem';

update public.portfolio_categories set
  hero_subtitle_hu = coalesce(nullif(hero_subtitle_hu, ''), 'Beton, neon, mozgás — a város a maga tempójában.'),
  hero_subtitle_en = coalesce(nullif(hero_subtitle_en, ''), 'Concrete, neon, motion — the city at its own pace.'),
  intro_hu = coalesce(nullif(intro_hu, ''),
    'Budapest utcái sosem ugyanazok kétszer: más a fény, más a tömeg, más a hangulat. Ezekben a képekben '
    'a várost keresem — a beton és a neon kontrasztját, az elhagyott ipari tereket, a járókelők '
    'véletlen koreográfiáját. Utcai és urbex helyszíneken fotózok, gyakran hajnalban vagy sötétedés '
    'után, amikor a város másképp mutatja magát. Portrékhoz is szívesen használom ezt a díszletet: '
    'a nyers környezet erős karaktert ad az embernek benne.'),
  hero_words = case when hero_words is null or cardinality(hero_words) = 0
    then array['beton','neon','utca','város','urbex','aszfalt','tömeg','hajnal']
    else hero_words end
where slug = 'urban';

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'portfolio_categories',
      'portfolio_items',
      'category_sections',
      'site_content',
      'services',
      'custom_sections'
    ])
  loop
    execute format(
      'alter table public.%I add column if not exists updated_at timestamptz not null default now()', t);

    execute format('drop trigger if exists trg_touch_updated_at on public.%I', t);
    execute format(
      'create trigger trg_touch_updated_at before update on public.%I
         for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

create table if not exists public.admin_users (
  email       text primary key,
  role        text not null default 'admin'
              check (role in ('superadmin', 'admin', 'demo')),
  permissions jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.admin_users
  where lower(email) = lower(auth.jwt() ->> 'email')
$$;
revoke all on function public.current_admin_role() from public;
grant execute on function public.current_admin_role() to authenticated;

drop policy if exists "admin_users read"   on public.admin_users;
drop policy if exists "admin_users write"  on public.admin_users;
drop policy if exists "admin_users insert" on public.admin_users;
drop policy if exists "admin_users update" on public.admin_users;
drop policy if exists "admin_users delete" on public.admin_users;

create policy "admin_users read"
  on public.admin_users for select using (auth.role() = 'authenticated');
create policy "admin_users insert"
  on public.admin_users for insert
  with check (public.current_admin_role() = 'superadmin');
create policy "admin_users update"
  on public.admin_users for update
  using (public.current_admin_role() = 'superadmin'
         and lower(email) <> lower(auth.jwt() ->> 'email'));
create policy "admin_users delete"
  on public.admin_users for delete
  using (public.current_admin_role() = 'superadmin'
         and lower(email) <> lower(auth.jwt() ->> 'email'));

create table if not exists public.bug_tickets (
  id           uuid primary key default gen_random_uuid(),
  description  text not null,
  cause        text,
  activity_log jsonb,
  created_by   text,
  status       text not null default 'open' check (status in ('open', 'closed')),
  created_at   timestamptz not null default now()
);
alter table public.bug_tickets enable row level security;
drop policy if exists "bug_tickets insert" on public.bug_tickets;
drop policy if exists "bug_tickets read"   on public.bug_tickets;
drop policy if exists "bug_tickets update" on public.bug_tickets;
drop policy if exists "bug_tickets delete" on public.bug_tickets;
create policy "bug_tickets insert" on public.bug_tickets for insert
  with check (auth.role() = 'authenticated');
create policy "bug_tickets read" on public.bug_tickets for select
  using (auth.role() = 'authenticated');
create policy "bug_tickets update" on public.bug_tickets for update
  using (public.current_admin_role() in ('superadmin', 'admin'));
create policy "bug_tickets delete" on public.bug_tickets for delete
  using (public.current_admin_role() = 'superadmin');

insert into public.admin_users (email, role)
values ('hajdutamas@webapp.com', 'superadmin')
on conflict (email) do update set role = 'superadmin';


alter table public.bug_tickets add column if not exists notified_at     timestamptz;
alter table public.bug_tickets add column if not exists notify_attempts int not null default 0;

alter table public.bug_tickets add column if not exists status_token text not null default gen_random_uuid()::text;

alter table public.bug_tickets alter column status drop default;
alter table public.bug_tickets drop constraint if exists bug_tickets_status_check;
update public.bug_tickets
  set status = 'reported'
  where status not in ('reported', 'in_progress', 'closed');
alter table public.bug_tickets
  add constraint bug_tickets_status_check check (status in ('reported', 'in_progress', 'closed'));
alter table public.bug_tickets alter column status set default 'reported';

drop policy if exists "bug_tickets read" on public.bug_tickets;
create policy "bug_tickets read" on public.bug_tickets for select
  using (
    public.current_admin_role() = 'superadmin'
    or lower(created_by) = lower(auth.jwt() ->> 'email')
  );

create table if not exists public.polls (
  id           uuid primary key default gen_random_uuid(),
  title_hu     text not null default '',
  title_en     text not null default '',
  columns      jsonb not null default '[]'::jsonb,
  has_votes    boolean not null default true,
  type         text not null default 'fixed'
               check (type in ('fixed', 'suggestions')),
  status       text not null default 'open'
               check (status in ('open', 'closed')),
  closes_at    timestamptz,
  active       boolean not null default false,
  default_view text not null default 'percent'
               check (default_view in ('percent', 'count')),
  test_mode    boolean not null default false,
  vote_style   text not null default 'updown',
  live_sort    boolean not null default true,
  starts_at    timestamptz,
  warn_before_min int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.polls add column if not exists test_mode boolean not null default false;
alter table public.polls add column if not exists vote_style text not null default 'updown';
alter table public.polls add column if not exists live_sort boolean not null default true;
alter table public.polls add column if not exists starts_at timestamptz;
alter table public.polls add column if not exists warn_before_min int not null default 0;

create table if not exists public.poll_options (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references public.polls(id) on delete cascade,
  cells       jsonb not null default '[]'::jsonb,
  up_votes    int not null default 0,
  down_votes  int not null default 0,
  approved    boolean not null default true,
  suggested   boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_poll_options_poll on public.poll_options (poll_id, sort_order);

create table if not exists public.poll_votes (
  id         uuid primary key default gen_random_uuid(),
  option_id  uuid not null references public.poll_options(id) on delete cascade,
  voter_id   text not null,
  direction  text not null check (direction in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique (option_id, voter_id)
);

create or replace function public.touch_polls_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_polls_touch on public.polls;
create trigger trg_polls_touch before update on public.polls
  for each row execute function public.touch_polls_updated_at();

create or replace function public.polls_single_active()
returns trigger language plpgsql as $$
begin
  if new.active then
    update public.polls set active = false where id <> new.id and active = true;
  end if;
  return new;
end $$;
drop trigger if exists trg_polls_single_active on public.polls;
create trigger trg_polls_single_active after insert or update of active on public.polls
  for each row when (new.active) execute function public.polls_single_active();

alter table public.polls        enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes   enable row level security;

drop policy if exists "Public read polls" on public.polls;
drop policy if exists "Admin all polls"   on public.polls;
create policy "Public read polls" on public.polls for select using (true);
create policy "Admin all polls" on public.polls for all
  using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo')
  with check (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');

drop policy if exists "Public read poll_options" on public.poll_options;
drop policy if exists "Admin read poll_options"  on public.poll_options;
drop policy if exists "Admin all poll_options"   on public.poll_options;
create policy "Public read poll_options" on public.poll_options for select using (approved = true);
create policy "Admin read poll_options" on public.poll_options for select using (auth.role() = 'authenticated');
create policy "Admin all poll_options" on public.poll_options for all
  using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo')
  with check (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');

drop policy if exists "Admin read poll_votes" on public.poll_votes;
create policy "Admin read poll_votes" on public.poll_votes for select using (auth.role() = 'authenticated');



create or replace function public.cast_vote(p_option uuid, p_voter text, p_dir text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll   public.polls;
  v_opt    public.poll_options;
  v_exist  public.poll_votes;
begin
  if p_dir not in ('up', 'down') or p_voter is null or length(p_voter) < 8 then
    return jsonb_build_object('status', 'error');
  end if;

  select o.* into v_opt from public.poll_options o where o.id = p_option and o.approved = true;
  if not found then return jsonb_build_object('status', 'error'); end if;

  select p.* into v_poll from public.polls p where p.id = v_opt.poll_id;
  if v_poll.status = 'closed' or (v_poll.closes_at is not null and v_poll.closes_at < now()) then
    return jsonb_build_object('status', 'closed');
  end if;

  if v_poll.test_mode then
    if p_dir = 'up' then
      update public.poll_options set up_votes = up_votes + 1 where id = p_option;
    else
      update public.poll_options set down_votes = down_votes + 1 where id = p_option;
    end if;
    select o.* into v_opt from public.poll_options o where o.id = p_option;
    return jsonb_build_object('status', 'ok', 'up', v_opt.up_votes, 'down', v_opt.down_votes);
  end if;

  select v.* into v_exist from public.poll_votes v
    where v.option_id = p_option and v.voter_id = p_voter;

  if not found then
    insert into public.poll_votes (option_id, voter_id, direction) values (p_option, p_voter, p_dir);
    if p_dir = 'up' then
      update public.poll_options set up_votes = up_votes + 1 where id = p_option;
    else
      update public.poll_options set down_votes = down_votes + 1 where id = p_option;
    end if;
  elsif v_exist.direction = p_dir then
    delete from public.poll_votes where id = v_exist.id;
    if p_dir = 'up' then
      update public.poll_options set up_votes = greatest(0, up_votes - 1) where id = p_option;
    else
      update public.poll_options set down_votes = greatest(0, down_votes - 1) where id = p_option;
    end if;
  else
    update public.poll_votes set direction = p_dir where id = v_exist.id;
    if p_dir = 'up' then
      update public.poll_options set up_votes = up_votes + 1, down_votes = greatest(0, down_votes - 1) where id = p_option;
    else
      update public.poll_options set down_votes = down_votes + 1, up_votes = greatest(0, up_votes - 1) where id = p_option;
    end if;
  end if;

  select o.* into v_opt from public.poll_options o where o.id = p_option;
  return jsonb_build_object('status', 'ok', 'up', v_opt.up_votes, 'down', v_opt.down_votes);
end;
$$;
grant execute on function public.cast_vote(uuid, text, text) to anon, authenticated;

create or replace function public.suggest_option(p_poll uuid, p_cells jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_poll public.polls;
begin
  select * into v_poll from public.polls where id = p_poll;
  if not found then return jsonb_build_object('status', 'error'); end if;
  if v_poll.type <> 'suggestions' then return jsonb_build_object('status', 'error'); end if;
  if v_poll.status = 'closed' or (v_poll.closes_at is not null and v_poll.closes_at < now()) then
    return jsonb_build_object('status', 'closed');
  end if;
  if p_cells is null or jsonb_typeof(p_cells) <> 'array' or jsonb_array_length(p_cells) = 0 then
    return jsonb_build_object('status', 'error');
  end if;

  insert into public.poll_options (poll_id, cells, approved, suggested, sort_order)
    values (p_poll, p_cells, false, true, 9999);

  return jsonb_build_object('status', 'ok');
end;
$$;
grant execute on function public.suggest_option(uuid, jsonb) to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['polls','poll_options'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

create table if not exists public.site_popups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  enabled     boolean not null default false,
  featured    boolean not null default false,
  trigger     text not null default 'first_visit' check (trigger in ('first_visit', 'subpage')),
  pages       jsonb not null default '[]'::jsonb,
  eyebrow_hu  text not null default '', eyebrow_en text not null default '',
  title1_hu   text not null default '', title1_en  text not null default '',
  title2_hu   text not null default '', title2_en  text not null default '',
  body_hu     text not null default '', body_en    text not null default '',
  button_hu   text not null default '', button_en  text not null default '',
  link        text not null default '',
  version     bigint not null default 0,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.touch_site_popups_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_site_popups_touch on public.site_popups;
create trigger trg_site_popups_touch before update on public.site_popups
  for each row execute function public.touch_site_popups_updated_at();

alter table public.site_popups enable row level security;
drop policy if exists "Public read site_popups" on public.site_popups;
drop policy if exists "Admin all site_popups"   on public.site_popups;

create policy "Public read site_popups" on public.site_popups for select using (enabled = true);
create policy "Admin all site_popups" on public.site_popups for all
  using (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo')
  with check (auth.role() = 'authenticated' and public.current_admin_role() is distinct from 'demo');