import { readFileSync } from 'node:fs';

// Emits SQL only. No network, credentials or automatic schema application.
const root = new URL('../', import.meta.url);
const [target, mode] = process.argv.slice(2);
if (!['ivifkrtupqizyqqsxdty', 'hxtsuhmqrufcdplidtov'].includes(target)) throw new Error('Pass the exact staging or Production project ref');
if (!['--baseline', '--candidate', '--installed', '--rollback'].includes(mode)) throw new Error('Use --baseline, --candidate, --installed or --rollback');
const migration = readFileSync(new URL('supabase/migrations/20261103171426_restrict_client_song_version_writes.sql', root), 'utf8');
const rollback = readFileSync(new URL('supabase/rollback/20261103171426_restrict_client_song_version_writes.sql', root), 'utf8');
const template = readFileSync(new URL('supabase/tests/song_version_write_boundary_probe.sql', root), 'utf8');
if (!template.trimEnd().endsWith('ROLLBACK;') || template.split('-- MIGRATION_UNDER_TEST').length !== 2) throw new Error('Invalid rollback-only probe');
const ddl = mode === '--candidate' ? migration : mode === '--rollback' ? `${migration}\n${rollback}` : '-- Installed schema only';
process.stdout.write(template.replace('-- MIGRATION_UNDER_TEST', () => ddl)
  .replace('/* CLIENT_WRITES_ALLOWED */', ['--baseline', '--rollback'].includes(mode) ? 'true' : 'false'));
