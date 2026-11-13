-- ZG-6 — offline audit mode (Nov 2026).
-- Additive only: existing code keeps working before and after this migration.
--
-- tenants.offline_audit_enabled : per-workspace switch for the offline mode (on-device storage, service worker).
--                                 Rolled out to the Za3fran workspace first.
-- client_updated_at             : when the auditor made the change ON THE PHONE (not when it reached the server).
--                                 With two devices, the most recent edit wins per standard / section.
-- updated_by                    : who made that change.
-- zg_apply_audit_response / zg_apply_audit_rating : write a change only if it is at least as recent as the stored
--                                 one, atomically; return whether it was applied and the value now stored.
--                                 Called by the server (service role) only.

alter table public.tenants
  add column if not exists offline_audit_enabled boolean not null default false;

alter table public.audit_responses
  add column if not exists client_updated_at timestamptz,
  add column if not exists updated_by uuid references public.users(id) on delete set null;

alter table public.audit_emotional_ratings
  add column if not exists client_updated_at timestamptz,
  add column if not exists updated_by uuid references public.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.zg_apply_audit_response(
  p_campaign uuid, p_standard uuid, p_response text, p_note text, p_client_ts timestamptz, p_user uuid
) returns jsonb
language plpgsql
set search_path = public
as $$
#variable_conflict use_column
declare
  -- a phone clock running ahead cannot push a change into the future
  ts timestamptz := least(coalesce(p_client_ts, now()), now() + interval '5 minutes');
  did boolean;
  cur record;
begin
  insert into audit_responses as r (campaign_id, standard_id, response, auditor_note, client_updated_at, updated_by, updated_at)
  values (p_campaign, p_standard, p_response, p_note, ts, p_user, now())
  on conflict (campaign_id, standard_id) do update
    set response = excluded.response,
        auditor_note = excluded.auditor_note,
        client_updated_at = excluded.client_updated_at,
        updated_by = excluded.updated_by,
        updated_at = now()
    where r.client_updated_at is null or r.client_updated_at <= excluded.client_updated_at;
  did := found;
  select response, auditor_note, client_updated_at into cur
    from audit_responses where campaign_id = p_campaign and standard_id = p_standard;
  return jsonb_build_object('applied', did, 'response', cur.response, 'note', cur.auditor_note, 'client_updated_at', cur.client_updated_at);
end;
$$;

create or replace function public.zg_apply_audit_rating(
  p_campaign uuid, p_section uuid, p_rating integer, p_client_ts timestamptz, p_user uuid
) returns jsonb
language plpgsql
set search_path = public
as $$
#variable_conflict use_column
declare
  ts timestamptz := least(coalesce(p_client_ts, now()), now() + interval '5 minutes');
  did boolean;
  cur record;
begin
  insert into audit_emotional_ratings as e (campaign_id, section_id, rating, client_updated_at, updated_by, updated_at)
  values (p_campaign, p_section, p_rating, ts, p_user, now())
  on conflict (campaign_id, section_id) do update
    set rating = excluded.rating,
        client_updated_at = excluded.client_updated_at,
        updated_by = excluded.updated_by,
        updated_at = now()
    where e.client_updated_at is null or e.client_updated_at <= excluded.client_updated_at;
  did := found;
  select rating, client_updated_at into cur
    from audit_emotional_ratings where campaign_id = p_campaign and section_id = p_section;
  return jsonb_build_object('applied', did, 'rating', cur.rating, 'client_updated_at', cur.client_updated_at);
end;
$$;

-- Server only (service role): never callable from a browser session
revoke all on function public.zg_apply_audit_response(uuid, uuid, text, text, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.zg_apply_audit_rating(uuid, uuid, integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.zg_apply_audit_response(uuid, uuid, text, text, timestamptz, uuid) to service_role;
grant execute on function public.zg_apply_audit_rating(uuid, uuid, integer, timestamptz, uuid) to service_role;

-- Rollout: Za3fran workspace and the ZG-6 test workspace first
update public.tenants set offline_audit_enabled = true
  where id in ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-4000-8000-00000000c1a0');
