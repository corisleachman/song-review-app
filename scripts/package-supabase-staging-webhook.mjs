import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const root = new URL('../', import.meta.url);
const output = await mkdtemp(join(tmpdir(), 'song-room-supabase-webhook-'));
const target = join(output, 'supabase/functions/stripe-staging-webhook');

async function read(path) {
  return readFile(new URL(path, root), 'utf8');
}

async function write(path, content) {
  const file = join(target, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

const lock = JSON.parse(await read('package-lock.json'));
const imports = Object.fromEntries(['stripe', '@supabase/supabase-js'].map(name => [
  name, `npm:${name}@${lock.packages[`node_modules/${name}`].version}`,
]));
imports['@/'] = './source/';

const route = 'app/api/stripe/webhook/route.ts';
const handler = await read(route);
await write(`source/${route}`, handler
  .replace("import { NextResponse } from 'next/server';\n", '')
  .replaceAll('NextResponse.json', 'Response.json')
  .replace('stripe.webhooks.constructEvent(', 'await stripe.webhooks.constructEventAsync(')
  .replace(/from '(@\/[^']+)'/g, "from '$1.ts'"));

for (const file of ['plans', 'referrals', 'safeErrorDetails', 'stripe', 'supabaseServer']) {
  const path = `lib/${file}.ts`;
  const source = await read(path);
  await write(`source/${path}`, source
    .replace(/from '((?:@\/|\.\/)[^']+)'/g, "from '$1.ts'")
    .replace('process.env.NEXT_PUBLIC_SUPABASE_URL', 'process.env.SUPABASE_URL'));
}

await write('index.ts', await read('staging-webhook/supabase/index.ts.template'));
await write('deno.json', JSON.stringify({ imports }, null, 2) + '\n');
await write('../../config.toml', '[functions.stripe-staging-webhook]\nverify_jwt = false\n');
console.log(output);
