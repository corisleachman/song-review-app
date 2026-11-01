-- Emergency rollback only: restores the known recursive baseline, not broad access.
-- Prefer a reviewed fix-forward. No CASCADE and no changes to membership data.
ALTER POLICY account_members_select_member ON public.account_members
  TO authenticated
  USING (account_id IN (
    SELECT account_members_1.account_id FROM public.account_members AS account_members_1
    WHERE account_members_1.user_id = auth.uid()
  ));
ALTER POLICY account_members_insert_owner ON public.account_members
  TO authenticated
  WITH CHECK (account_id IN (
    SELECT account_members_1.account_id FROM public.account_members AS account_members_1
    WHERE account_members_1.user_id = auth.uid() AND account_members_1.role = 'owner'::public.account_role
  ));
ALTER POLICY account_members_insert_owner_admin ON public.account_members
  TO public
  WITH CHECK (public.has_account_role(account_id, ARRAY['owner'::public.account_role, 'admin'::public.account_role]));
ALTER POLICY account_members_delete_owner ON public.account_members
  TO authenticated
  USING (account_id IN (
    SELECT account_members_1.account_id FROM public.account_members AS account_members_1
    WHERE account_members_1.user_id = auth.uid() AND account_members_1.role = 'owner'::public.account_role
  ));
ALTER POLICY account_members_delete_owner_admin ON public.account_members
  TO public
  USING (public.has_account_role(account_id, ARRAY['owner'::public.account_role, 'admin'::public.account_role]));
ALTER POLICY account_members_update_owner ON public.account_members
  TO public
  USING (public.has_account_role(account_id, ARRAY['owner'::public.account_role]))
  WITH CHECK (public.has_account_role(account_id, ARRAY['owner'::public.account_role]));

DROP FUNCTION song_room_private.is_workspace_member(uuid);
DROP FUNCTION song_room_private.has_workspace_role(uuid, public.account_role[]);
DROP SCHEMA song_room_private RESTRICT;
