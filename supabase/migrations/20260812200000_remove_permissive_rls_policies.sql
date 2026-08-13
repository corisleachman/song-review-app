-- Legacy permissive policies are combined with other policies using OR.
-- Removing them lets the existing member and public-share policies enforce the
-- intended workspace boundary.

DROP POLICY IF EXISTS "Enable read access for all users" ON public.songs;
DROP POLICY IF EXISTS "settings_authenticated_all" ON public.settings;
