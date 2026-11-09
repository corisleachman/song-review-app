// Writes the branded Supabase Auth email templates to supabase/auth-email-templates/.
// Run: node scripts/build-auth-email-templates.mjs
// Then paste each file's HTML and subject into Supabase > Authentication > Emails
// (staging and Production, so they stay identical).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../lib/emailTemplates.ts', import.meta.url), 'utf8');
const templates = {};
new Function('require', 'exports', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(require, templates);

const outDir = new URL('../supabase/auth-email-templates/', import.meta.url);
mkdirSync(outDir, { recursive: true });
const kinds = ['confirm_signup', 'reset_password', 'reauthentication', 'password_changed'];
const subjects = [];
for (const kind of kinds) {
  const { subject, html } = templates.buildAuthTemplate(kind);
  writeFileSync(new URL(`${kind}.html`, outDir), `${html}\n`);
  subjects.push(`${kind}\t${subject}`);
}
writeFileSync(new URL('subjects.tsv', outDir), `${subjects.join('\n')}\n`);
console.log(subjects.join('\n'));
