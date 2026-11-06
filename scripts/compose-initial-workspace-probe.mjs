import { readFileSync } from 'node:fs';

// Emits rollback-only SQL, with no network access, credentials or application.
const root = new URL('../', import.meta.url);
const [target, mode] = process.argv.slice(2);
if (!['ivifkrtupqizyqqsxdty', 'hxtsuhmqrufcdplidtov'].includes(target)) throw new Error('Pass the exact staging or Production project ref');
if (!['--candidate', '--installed', '--rollback'].includes(mode)) throw new Error('Use --candidate, --installed or --rollback');
const migration = readFileSync(new URL('supabase/migrations/20261102165139_atomic_initial_workspace.sql', root), 'utf8');
const rollback = readFileSync(new URL('supabase/rollback/20261102165139_atomic_initial_workspace.sql', root), 'utf8');
const template = readFileSync(new URL('supabase/tests/initial_workspace_probe.sql', root), 'utf8');
if (!template.trimEnd().endsWith('ROLLBACK;') || template.split('-- MIGRATION_UNDER_TEST').length !== 2) throw new Error('Invalid rollback-only probe');
const down = mode === '--rollback' ? `${rollback}\nINSERT INTO bootstrap_probe_results SELECT 'rollback removes RPC without deleting workspaces', to_regprocedure('public.ensure_initial_workspace_membership(uuid,text)') IS NULL AND (SELECT count(*) FROM public.accounts WHERE created_by_user_id=(SELECT user_a FROM bootstrap_probe_fixture))=1;` : '';
process.stdout.write(template.replace('-- MIGRATION_UNDER_TEST', () => mode === '--installed' ? '-- Installed schema only' : migration)
  .replace('-- ROLLBACK_UNDER_TEST', () => down ? `${down}\nDO $$ BEGIN IF EXISTS(SELECT 1 FROM bootstrap_probe_results WHERE NOT passed) THEN RAISE EXCEPTION 'Rollback probe failed'; END IF; END $$;` : ''));
