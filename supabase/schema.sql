-- ============================================================================
-- Erin Uken website — Supabase schema
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.
-- Then create your admin user (Authentication → Users → Add user) and create
-- two PUBLIC storage buckets named "media" and "documents".
-- ============================================================================

-- ---------- Tables ----------

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  interest text,
  message text,
  marketing_email_opt_in boolean default false,
  marketing_text_opt_in boolean default false,
  california_opt_in boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  role text,
  rating int default 5 check (rating between 1 and 5),
  quote text not null,
  approved boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tag text,
  description text,
  image_url text,
  link_url text,
  category text default 'general',
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  note text,
  tag text,                 -- free-form: Self Help, Grief, Business, AI, Academic, etc.
  kind text default 'book', -- 'book' or 'product'
  image_url text,
  buy_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  title text,
  kind text check (kind in ('image','video','document')),
  bucket text,
  path text,
  url text,
  created_at timestamptz default now()
);

-- ---------- Row Level Security ----------

alter table public.contact_submissions enable row level security;
alter table public.testimonials       enable row level security;
alter table public.portfolio_items    enable row level security;
alter table public.media_assets        enable row level security;
alter table public.books               enable row level security;

create policy "books read (public)"   on public.books for select to anon, authenticated using (true);
create policy "books manage (admin)"  on public.books for all    to authenticated using (true) with check (true);

-- Contact: anyone may submit; only signed-in admins may read/manage.
create policy "contact insert (public)"  on public.contact_submissions for insert to anon, authenticated with check (true);
create policy "contact manage (admin)"   on public.contact_submissions for all    to authenticated using (true) with check (true);

-- Testimonials: anyone may submit (defaults to unapproved) and read APPROVED ones;
-- admins manage everything.
create policy "testi read approved"      on public.testimonials for select to anon using (approved = true);
create policy "testi submit (public)"    on public.testimonials for insert to anon with check (approved = false);
create policy "testi manage (admin)"     on public.testimonials for all    to authenticated using (true) with check (true);

-- Portfolio & media: public read, admin write.
create policy "portfolio read (public)"  on public.portfolio_items for select to anon, authenticated using (true);
create policy "portfolio manage (admin)" on public.portfolio_items for all    to authenticated using (true) with check (true);

create policy "media read (public)"      on public.media_assets for select to anon, authenticated using (true);
create policy "media manage (admin)"     on public.media_assets for all    to authenticated using (true) with check (true);

-- ---------- Storage buckets ----------
-- Create these in Dashboard → Storage (mark both PUBLIC), or run:
insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documents', 'documents', true)
  on conflict (id) do nothing;

-- Public read; only authenticated admins may upload/delete.
create policy "storage public read"   on storage.objects for select to anon, authenticated
  using (bucket_id in ('media','documents'));
create policy "storage admin write"   on storage.objects for insert to authenticated
  with check (bucket_id in ('media','documents'));
create policy "storage admin delete"  on storage.objects for delete to authenticated
  using (bucket_id in ('media','documents'));
