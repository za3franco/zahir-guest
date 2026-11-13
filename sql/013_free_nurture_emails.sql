-- ZG-6 — follow-up emails for the free "Découverte" plan (Nov 2026).
-- nurture_emails_sent : keys of the emails already sent to this workspace, so none is ever sent twice
--                       ('d2' = first audit nudge, 'd14' = Hotel plan reminder, 'quota-2026Q4' = quarterly
--                       quota reached, one per quarter at most).
-- nurture_unsubscribed_at : set when an admin clicks the unsubscribe link; no follow-up email after that
--                           (service emails — invitations, billing — are not affected).

alter table public.tenants
  add column if not exists nurture_emails_sent jsonb not null default '[]'::jsonb,
  add column if not exists nurture_unsubscribed_at timestamptz;
