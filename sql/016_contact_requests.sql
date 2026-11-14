-- 016 : demandes de contact (formulaire « Parlons-en », Enterprise et gros porteurs).
-- Ajout seulement : une nouvelle table, lue et écrite uniquement par le serveur (rôle de service).
create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null default 'enterprise',
  lang text not null default 'fr',
  source text,
  contact_name text not null,
  company text not null,
  job_title text,
  email text not null,
  phone text,
  country text,
  activity text,
  properties_wanted integer,
  audits_per_month integer,
  message text,
  status text not null default 'new'
);

alter table public.contact_requests enable row level security;
-- Aucune politique : ni anon ni authenticated ne lisent ni n'écrivent ; le rôle de service passe outre.
revoke all on public.contact_requests from anon, authenticated;
