import { readFileSync } from 'node:fs';

// Emits SQL only; no credentials, network or automatic hosted changes.
const root = new URL('../', import.meta.url);
const [target, mode] = process.argv.slice(2);
if (!['ivifkrtupqizyqqsxdty', 'hxtsuhmqrufcdplidtov'].includes(target)) throw new Error('Pass the exact staging or Production project ref');
if (!['--baseline', '--candidate', '--installed', '--rollback'].includes(mode)) throw new Error('Use --baseline, --candidate, --installed or --rollback');
const migration = readFileSync(new URL('supabase/migrations/20261102220823_restrict_anonymous_raw_song_reads.sql', root), 'utf8');
const rollback = readFileSync(new URL('supabase/rollback/20261102220823_restrict_anonymous_raw_song_reads.sql', root), 'utf8');
const template = readFileSync(new URL('supabase/tests/public_data_boundary_probe.sql', root), 'utf8');
if (!template.trimEnd().endsWith('ROLLBACK;') || template.split('-- MIGRATION_UNDER_TEST').length !== 2) throw new Error('Invalid rollback-only probe');
const ddl = mode === '--candidate' ? migration : mode === '--rollback' ? `${migration}\n${rollback}` : '-- Installed schema only';
process.stdout.write(template.replace('-- MIGRATION_UNDER_TEST', () => ddl)
 .replace('/* ANON_READ_ALLOWED */', ['--baseline', '--rollback'].includes(mode) ? 'true' : 'false'));
