import { readFileSync } from 'node:fs';

// Emits SQL only. It never connects, applies a migration or reads credentials.
const root = new URL('../', import.meta.url);
const target = process.argv[2];
if (target !== 'ivifkrtupqizyqqsxdty') {
  throw new Error('Pass the exact staging project ref: ivifkrtupqizyqqsxdty');
}
const mode = process.argv[3] ?? '--candidate';
if (mode !== '--candidate' && mode !== '--installed') {
  throw new Error('Use --candidate or --installed');
}
const migration = mode === '--installed'
  ? '-- Check installed definitions without reapplying candidate DDL.'
  : [
  '20261101153149_fix_membership_rls_recursion.sql',
  '20261101153157_pin_function_search_paths.sql',
].map(name => readFileSync(new URL(`supabase/migrations/${name}`, root), 'utf8')).join('\n');
const template = readFileSync(new URL('supabase/tests/membership_rls_probe.sql', root), 'utf8');
const marker = '-- MIGRATION_UNDER_TEST';
if (template.split(marker).length !== 2 || !template.trimEnd().endsWith('ROLLBACK;')) {
  throw new Error('Invalid probe template: expected one migration marker and final ROLLBACK');
}
process.stdout.write(template.replace(marker, () => migration));
