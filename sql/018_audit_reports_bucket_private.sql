-- 018 : le bucket audit-reports n'est utilisé par aucun code et ne contient aucun fichier : il passe en privé (16 nov. 2026).
-- Appliqué en production le 16 nov. 2026 (migration « audit_reports_bucket_private »).
-- Retour arrière : update storage.buckets set public = true where id = 'audit-reports';
update storage.buckets set public = false where id = 'audit-reports';
