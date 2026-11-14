-- ZG-6 — offline audit mode on by default for every workspace (Arnaud, 14 Nov 2026).
-- The per-workspace switch (tenants.offline_audit_enabled, super admin "Offline: on/off") stays as a kill switch.
alter table public.tenants alter column offline_audit_enabled set default true;
update public.tenants set offline_audit_enabled = true where offline_audit_enabled = false;
