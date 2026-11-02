import { readFileSync } from 'node:fs';

// Emits rollback-only SQL. No credentials, network or automatic migration.
const root = new URL('../', import.meta.url);
const [target, mode] = process.argv.slice(2);
if (!['ivifkrtupqizyqqsxdty', 'hxtsuhmqrufcdplidtov'].includes(target)) throw new Error('Pass the exact staging or Production project ref');
if (!['--baseline', '--candidate', '--installed', '--rollback'].includes(mode)) throw new Error('Use --baseline, --candidate, --installed or --rollback');
const migration = readFileSync(new URL('supabase/migrations/20261102162535_atomic_feedback_rate_limit.sql', root), 'utf8');
const rollback = readFileSync(new URL('supabase/rollback/20261102162535_atomic_feedback_rate_limit.sql', root), 'utf8');
const template = readFileSync(new URL('supabase/tests/feedback_rate_limit_probe.sql', root), 'utf8');
if (!template.trimEnd().endsWith('ROLLBACK;') || template.split('-- MIGRATION_UNDER_TEST').length !== 2) throw new Error('Invalid rollback-only probe');
const ddl = mode === '--candidate' ? migration : mode === '--rollback' ? `${migration}\n${rollback}` : '-- Installed schema';
process.stdout.write(template.replace('-- MIGRATION_UNDER_TEST', () => ddl)
  .replaceAll('/* LIMIT_EXPECTED */', ['--candidate', '--installed'].includes(mode) ? 'true' : 'false'));
