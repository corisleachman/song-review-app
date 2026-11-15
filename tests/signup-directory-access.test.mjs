import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(
  readFileSync(new URL('../app/admin/signups/page.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;
const ownerEmail = 'corisleachman@googlemail.com';
const denied = new Error('Not found');

for (const [label, identity] of [
  ['signed-out visitor', null],
  ['verified user with another email', { email: 'member@example.test', emailConfirmed: true }],
  ['owner email without confirmation', { email: ownerEmail, emailConfirmed: false }],
]) {
  test(`signup directory rejects ${label} before loading privileged data`, async () => {
    const exports = {};
    const dependencies = {
      'next/link': {},
      'next/navigation': { notFound: () => { throw denied; } },
      'react/jsx-runtime': {},
      '@/lib/currentUser': { getCurrentAuthenticatedUser: async () => identity },
      '@/lib/supabaseServer': {
        get supabaseServer() {
          assert.fail('Denied requests must never access privileged data.');
        },
      },
      '../feedback/feedback.module.css': {},
    };
    new Function('require', 'exports', source)(name => {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    }, exports);
    await assert.rejects(
      exports.default({ searchParams: Promise.resolve({ q: 'test' }) }),
      error => error === denied,
    );
  });
}
