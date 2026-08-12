-- Remove legacy policies whose permissive rules override the scoped policies.

DROP POLICY IF EXISTS "Enable read access for all users" ON public.songs;
DROP POLICY IF EXISTS "settings_authenticated_all" ON public.settings;
