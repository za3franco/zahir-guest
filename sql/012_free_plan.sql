-- ZG-5 free "Découverte" plan (Nov 2026).
-- 1. 'free' becomes a valid subscription tier (sign-ups start there; ended pilots fall back to it).
-- 2. The "Zahir Guest — Essentiel" platform questionnaire: the first 7 standards of 9 core sections of
--    the full library (about 63 standards). The only platform questionnaire usable on the free plan.
--    Copied from the library at migration time; idempotent (does nothing if it already exists).

alter table public.tenants drop constraint if exists tenants_subscription_tier_check;
alter table public.tenants add constraint tenants_subscription_tier_check
  check (subscription_tier = any (array['za3fran_internal', 'free', 'starter', 'professional', 'enterprise']));

do $$
declare
  lib constant uuid := 'b0000000-0000-0000-0000-000000000001';
  ess constant uuid := 'b0000000-0000-0000-0000-000000000002';
  core text[] := array[
    'Réservations', 'Enregistrement', 'Départ', 'Services aux Clients / Concierge',
    'Arrivée — Chambre & Salle de bain', 'Nettoyage en cours de séjour', 'Petit-déjeuner',
    'La Chambre — Produit & Équipements', 'Parties Communes'];
  d record;
  s record;
  new_domain uuid;
  new_section uuid;
  dom_order int := 0;
  sec_order int;
begin
  if exists (select 1 from public.questionnaire_templates where id = ess) then
    return;
  end if;
  if not exists (select 1 from public.questionnaire_templates where id = lib) then
    raise exception 'library template % not found', lib;
  end if;

  insert into public.questionnaire_templates (id, tenant_id, name, tier, language, version, is_active)
  values (ess, null, 'Zahir Guest — Essentiel', 'custom', 'bilingual', 1, true);

  for d in
    select * from public.template_domains td
    where td.template_id = lib
      and exists (select 1 from public.template_sections ts where ts.domain_id = td.id and ts.name_fr = any (core))
    order by td.display_order
  loop
    dom_order := dom_order + 1;
    insert into public.template_domains (template_id, name_en, name_fr, display_order, weight)
    values (ess, d.name_en, d.name_fr, dom_order, d.weight)
    returning id into new_domain;

    sec_order := 0;
    for s in
      select * from public.template_sections ts
      where ts.domain_id = d.id and ts.name_fr = any (core)
      order by ts.display_order
    loop
      sec_order := sec_order + 1;
      insert into public.template_sections (domain_id, name_en, name_fr, display_order, is_optional, weight)
      values (new_domain, s.name_en, s.name_fr, sec_order, false, s.weight)
      returning id into new_section;

      insert into public.template_standards
        (section_id, question_en, question_fr, performance_classification, display_order, is_critical, guidance_en, guidance_fr)
      select new_section, st.question_en, st.question_fr, st.performance_classification,
             row_number() over (order by st.display_order), st.is_critical, st.guidance_en, st.guidance_fr
      from (
        select * from public.template_standards x where x.section_id = s.id order by x.display_order limit 7
      ) st;
    end loop;
  end loop;
end $$;
