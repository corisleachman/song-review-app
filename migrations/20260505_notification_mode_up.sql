-- Add notification_mode to accounts table
-- Controls who receives email notifications when a comment is posted in a workspace
-- all_members: everyone in the workspace except the commenter receives an email
-- owner_only: only the workspace owner receives an email, regardless of who commented

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS notification_mode TEXT NOT NULL DEFAULT 'all_members'
  CHECK (notification_mode IN ('all_members', 'owner_only'));

COMMENT ON COLUMN accounts.notification_mode IS
  'Controls comment notification recipients. all_members = every workspace member except the commenter. owner_only = workspace owner only.';
