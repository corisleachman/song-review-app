-- Replace membership self-references; preserve owner/admin write semantics.
-- Requires a privileged migration role. This is not an application RPC.
CREATE SCHEMA IF NOT EXISTS song_room_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA song_room_private FROM PUBLIC, anon;
REVOKE CREATE ON SCHEMA song_room_private FROM authenticated;
GRANT USAGE ON SCHEMA song_room_private TO authenticated;

CREATE OR REPLACE FUNCTION song_room_private.is_workspace_member(target_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.account_members AS member
      WHERE member.account_id = target_account_id
        AND member.user_id = (SELECT auth.uid())
    );
$function$;

ALTER FUNCTION song_room_private.is_workspace_member(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION song_room_private.is_workspace_member(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
-- Policy evaluation needs EXECUTE. The function returns only current-user
-- membership, accepts no user id and lives outside the exposed public schema.
GRANT EXECUTE ON FUNCTION song_room_private.is_workspace_member(uuid) TO authenticated;

ALTER POLICY account_members_select_member ON public.account_members
  TO authenticated
  USING ((SELECT song_room_private.is_workspace_member(account_id)));

CREATE OR REPLACE FUNCTION song_room_private.has_workspace_role(
  target_account_id uuid, allowed_roles public.account_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.account_members AS member
      WHERE member.account_id = target_account_id
        AND member.user_id = (SELECT auth.uid())
        AND member.role = ANY(allowed_roles)
    );
$function$;

ALTER FUNCTION song_room_private.has_workspace_role(uuid, public.account_role[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION song_room_private.has_workspace_role(uuid, public.account_role[])
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION song_room_private.has_workspace_role(uuid, public.account_role[]) TO authenticated;

ALTER POLICY account_members_insert_owner ON public.account_members
  TO authenticated
  WITH CHECK ((SELECT song_room_private.has_workspace_role(account_id, ARRAY['owner'::public.account_role])));
ALTER POLICY account_members_insert_owner_admin ON public.account_members
  TO authenticated
  WITH CHECK ((SELECT song_room_private.has_workspace_role(account_id, ARRAY['owner'::public.account_role, 'admin'::public.account_role])));
ALTER POLICY account_members_delete_owner ON public.account_members
  TO authenticated
  USING ((SELECT song_room_private.has_workspace_role(account_id, ARRAY['owner'::public.account_role])));
ALTER POLICY account_members_delete_owner_admin ON public.account_members
  TO authenticated
  USING ((SELECT song_room_private.has_workspace_role(account_id, ARRAY['owner'::public.account_role, 'admin'::public.account_role])));
ALTER POLICY account_members_update_owner ON public.account_members
  TO authenticated
  USING ((SELECT song_room_private.has_workspace_role(account_id, ARRAY['owner'::public.account_role])))
  WITH CHECK ((SELECT song_room_private.has_workspace_role(account_id, ARRAY['owner'::public.account_role])));
