-- Restore the previous application deployment before removing this RPC.
-- Normally leave the unused function installed. Dropping it while the new
-- app is active breaks first-time setup. No workspace/member rows are deleted.
drop function if exists public.ensure_initial_workspace_membership(uuid,text);
