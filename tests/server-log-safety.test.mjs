import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

function loadTs(filename, stubs = {}, logger = console) {
  const exports = {};
  const js = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', 'console', js)(name => {
    assert.ok(Object.hasOwn(stubs, name), `Unexpected dependency: ${name}`); return stubs[name];
  }, exports, logger);
  return exports;
}

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(filename) : filename.endsWith('.ts') ? [filename] : [];
  });
}

test('server diagnostics do not pass raw exception objects or messages to the logger', () => {
  const unsafe = [];
  for (const filename of [...filesUnder('app/api'), ...filesUnder('lib')]) {
    const tree = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && node.expression.expression.getText(tree) === 'console' && ['error', 'warn'].includes(node.expression.name.text)) {
        for (const arg of node.arguments) {
          if ((ts.isIdentifier(arg) && /^(?:error|err|e|.*Error|.*Err)$/.test(arg.text))
            || (ts.isPropertyAccessExpression(arg) && arg.name.text === 'message')) {
            unsafe.push(`${filename}:${tree.getLineAndCharacterOfPosition(arg.pos).line + 1}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  assert.deepEqual(unsafe, []);
});

for (const modern of [false, true]) {
  test(`CSP ${modern ? 'Reporting API' : 'legacy'} logs omit credentials, capability paths and unrecognised directive text`, async () => {
    const messages = [];
    const route = loadTs('app/api/csp-report/route.ts', { 'next/server': { NextResponse: class extends Response {
      static json(body, init) { return Response.json(body, init); }
    } } }, { warn: (...args) => messages.push(args) });
    const body = modern ? {
      type: 'csp-violation', body: {
        documentURL: 'https://user:PRIVATE-PASSWORD@example.test/invite/PRIVATE-CAPABILITY?token=PRIVATE-TOKEN#PRIVATE-HASH',
        blockedURL: '/auth/confirm?token_hash=PRIVATE-RELATIVE-TOKEN', sourceFile: 'not a url?token=PRIVATE-MALFORMED-TOKEN',
        effectiveDirective: 'script-src', violatedDirective: 'script-src PRIVATE-DIRECTIVE', disposition: 'enforce',
      },
    } : { 'csp-report': {
      'document-uri': 'https://user:PRIVATE-PASSWORD@example.test/invite/PRIVATE-CAPABILITY?token=PRIVATE-TOKEN#PRIVATE-HASH',
      'blocked-uri': '/auth/confirm?token_hash=PRIVATE-RELATIVE-TOKEN', 'source-file': 'not a url?token=PRIVATE-MALFORMED-TOKEN',
      'effective-directive': 'script-src', 'violated-directive': 'script-src PRIVATE-DIRECTIVE', disposition: 'enforce',
      'original-policy': 'PRIVATE-POLICY', 'script-sample': 'PRIVATE-SAMPLE',
    } };
    const response = await route.POST(new Request('https://staging.invalid/api/csp-report', {
      method: 'POST', headers: { 'content-type': modern ? 'application/reports+json' : 'application/csp-report' }, body: JSON.stringify(modern ? [body] : body),
    }));
    assert.equal(response.status, 204); assert.equal(messages.length, 1);
    assert.doesNotMatch(JSON.stringify(messages), /PRIVATE-/);
    const logged = JSON.parse(messages[0][1]);
    assert.equal(logged.documentUrl, 'https://example.test');
    assert.equal(logged.effectiveDirective, 'script-src'); assert.equal(logged.disposition, 'enforce');
    assert.equal(logged.blockedUrl, null); assert.equal(logged.sourceFile, null); assert.equal(logged.violatedDirective, null);
  });
}

for (const [code, status] of [['23505', 409], ['ECONNRESET', 503], ['resource_missing', 404]]) {
  test(`diagnostics retain known operational code ${code} and HTTP status without exception contents`, () => {
    const { safeErrorDetails } = loadTs('lib/safeErrorDetails.ts');
    const error = Object.assign(new Error('PRIVATE-MESSAGE'), {
      code, status, stack: 'PRIVATE-STACK', cause: { authorization: 'PRIVATE-AUTH' },
      request: { url: 'https://example.test/?token=PRIVATE-TOKEN', body: 'PRIVATE-BODY' },
      toJSON() { throw new Error('must not serialize provider objects'); },
    });
    const result = safeErrorDetails(error);
    assert.deepEqual(result, { kind: 'exception', code, status });
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE-/);
  });
}

test('diagnostics drop arbitrary codes/status text and never call getters or proxy traps outside recovery', () => {
  const { safeErrorDetails } = loadTs('lib/safeErrorDetails.ts');
  assert.deepEqual(safeErrorDetails({ code: 'PRIVATE-CODE', status: 'PRIVATE-STATUS', message: 'PRIVATE-MESSAGE' }), { kind: 'provider_error' });
  for (const status of [-1, 0, 99, 600, Infinity, NaN, 401.5]) {
    assert.deepEqual(safeErrorDetails({ status }), { kind: 'provider_error' });
  }
  let accessed = false;
  const getters = { get code() { accessed = true; throw new Error('PRIVATE-GETTER'); } };
  assert.deepEqual(safeErrorDetails(getters), { kind: 'provider_error' }); assert.equal(accessed, false);
  const proxy = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('PRIVATE-PROXY'); } });
  assert.deepEqual(safeErrorDetails(proxy), { kind: 'unknown' });
  for (const value of [null, undefined, 'PRIVATE-STRING', 123]) assert.deepEqual(safeErrorDetails(value), { kind: 'unknown' });
});

test('CSP keeps recognised protocol/origin diagnostics, bounds batches and omits arbitrary schemes', async () => {
  const logs = [];
  const route = loadTs('app/api/csp-report/route.ts', { 'next/server': { NextResponse: class extends Response {
    static json(body, init) { return Response.json(body, init); }
  } } }, { warn: (...args) => logs.push(args) });
  const reports = Array.from({ length: 12 }, () => ({ type: 'csp-violation', body: {
    blockedURL: 'data:text/html,PRIVATE-PAYLOAD', documentURL: 'https://example.test/songs/PRIVATE-ID?secret=PRIVATE-QUERY',
    sourceFile: 'private-secret:PRIVATE-PAYLOAD', effectiveDirective: 'connect-src', disposition: 'PRIVATE-DISPOSITION',
  } }));
  assert.equal((await route.POST(new Request('https://staging.invalid/api/csp-report', {
    method: 'POST', headers: { 'content-type': 'application/reports+json' }, body: JSON.stringify(reports),
  }))).status, 204);
  assert.equal(logs.length, 10); assert.doesNotMatch(JSON.stringify(logs), /PRIVATE-|private-secret/);
  const first = JSON.parse(logs[0][1]); assert.equal(first.blockedUrl, 'data:'); assert.equal(first.sourceFile, null);
  assert.equal(first.documentUrl, 'https://example.test'); assert.equal(first.effectiveDirective, 'connect-src'); assert.equal(first.disposition, null);
});

test('CSP validation failures do not log submitted report contents', async () => {
  const logs = [];
  const route = loadTs('app/api/csp-report/route.ts', { 'next/server': { NextResponse: class extends Response {
    static json(body, init) { return Response.json(body, init); }
  } } }, { warn: (...args) => logs.push(args) });
  for (const [body, type, length, expected] of [
    ['{}', 'application/csp-report', '20000', 413],
    ['x'.repeat(17000), 'application/csp-report', undefined, 413],
    ['{}', 'application/json', undefined, 415],
    ['PRIVATE-NOT-JSON', 'application/csp-report', undefined, 400],
    ['null', 'application/csp-report', undefined, 400],
  ]) {
    const headers = { 'content-type': type }; if (length) headers['content-length'] = length;
    const response = await route.POST(new Request('https://staging.invalid/api/csp-report', { method: 'POST', headers, body }));
    assert.equal(response.status, expected);
  }
  assert.deepEqual(logs, []);
});
