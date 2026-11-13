-- ZG-5 security hardening (13 Nov 2026). Applied in production before the free plan opens sign-ups.
-- The app reads and writes these tables only on the server with the service role (which bypasses RLS);
-- browser sessions are used for authentication only. These policies close direct API access with a
-- user session (anon key + login), which until now allowed:
--   • any logged-in user to read every questionnaire question of every workspace (and the full library),
--   • any workspace admin to modify or delete any question, section or domain, of any workspace,
--   • any user to update their own row without limit (role, tenant) → escalation to super admin,
--   • any workspace admin to delete campaigns of any workspace.

-- 1. Questionnaires: a user session sees only its own workspace's questionnaires; writes are server-only.
drop policy if exists templates_select on public.questionnaire_templates;
drop policy if exists templates_insert on public.questionnaire_templates;
drop policy if exists templates_update on public.questionnaire_templates;
drop policy if exists templates_delete on public.questionnaire_templates;
create policy templates_select on public.questionnaire_templates for select
  using (current_user_role() = 'super_admin' or (tenant_id is not null and tenant_id = current_user_tenant_id()));
create policy templates_write on public.questionnaire_templates for all
  using (current_user_role() = 'super_admin') with check (current_user_role() = 'super_admin');

drop policy if exists template_domains_select on public.template_domains;
drop policy if exists template_domains_write on public.template_domains;
create policy template_domains_select on public.template_domains for select using (
  current_user_role() = 'super_admin' or exists (
    select 1 from public.questionnaire_templates t
    where t.id = template_domains.template_id and t.tenant_id is not null and t.tenant_id = current_user_tenant_id()));
create policy template_domains_write on public.template_domains for all
  using (current_user_role() = 'super_admin') with check (current_user_role() = 'super_admin');

drop policy if exists template_sections_select on public.template_sections;
drop policy if exists template_sections_write on public.template_sections;
create policy template_sections_select on public.template_sections for select using (
  current_user_role() = 'super_admin' or exists (
    select 1 from public.template_domains d join public.questionnaire_templates t on t.id = d.template_id
    where d.id = template_sections.domain_id and t.tenant_id is not null and t.tenant_id = current_user_tenant_id()));
create policy template_sections_write on public.template_sections for all
  using (current_user_role() = 'super_admin') with check (current_user_role() = 'super_admin');

drop policy if exists template_standards_select on public.template_standards;
drop policy if exists template_standards_write on public.template_standards;
create policy template_standards_select on public.template_standards for select using (
  current_user_role() = 'super_admin' or exists (
    select 1 from public.template_sections s
    join public.template_domains d on d.id = s.domain_id
    join public.questionnaire_templates t on t.id = d.template_id
    where s.id = template_standards.section_id and t.tenant_id is not null and t.tenant_id = current_user_tenant_id()));
create policy template_standards_write on public.template_standards for all
  using (current_user_role() = 'super_admin') with check (current_user_role() = 'super_admin');

-- 2. Users: no self-service changes through the API (profile updates go through the server).
drop policy if exists users_update on public.users;
drop policy if exists users_insert on public.users;
create policy users_update on public.users for update
  using (current_user_role() = 'super_admin') with check (current_user_role() = 'super_admin');
create policy users_insert on public.users for insert
  with check (current_user_role() = 'super_admin');

-- 3. Campaigns: workspace admins delete only their own workspace's campaigns.
drop policy if exists campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns for delete using (
  current_user_role() = 'super_admin' or (current_user_role() = 'tenant_admin' and tenant_id = current_user_tenant_id()));

-- 4. Properties: only admins create properties.
drop policy if exists properties_insert on public.properties;
create policy properties_insert on public.properties for insert with check (
  current_user_role() = 'super_admin' or (current_user_role() = 'tenant_admin' and tenant_id = current_user_tenant_id()));
