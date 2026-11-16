-- 017 : durcissement des fonctions SECURITY DEFINER signalées par le contrôle de sécurité Supabase (14 nov. 2026).
-- Ajout seulement côté comportement : les politiques RLS continuent de fonctionner pour les personnes connectées ;
-- la personne non connectée (rôle anon) ne peut plus appeler ces fonctions par /rest/v1/rpc, et leur chemin de
-- recherche est figé (un schéma piégé ne peut plus les détourner).
alter function public.current_user_role() set search_path = public, pg_temp;
alter function public.current_user_tenant_id() set search_path = public, pg_temp;
alter function public.update_updated_at_column() set search_path = public, pg_temp;

revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.current_user_tenant_id() from public, anon;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.current_user_tenant_id() to authenticated, service_role;
