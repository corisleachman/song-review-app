import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const root = new URL('../', import.meta.url);
const output = await mkdtemp(join(tmpdir(), 'song-room-staging-webhook-'));

async function copy(source, destination = source) {
  const target = join(output, destination);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(new URL(source, root), target);
}

const route = 'app/api/stripe/webhook/route.ts';
await copy(`staging-webhook/${route}`, route);
await copy(route, `source/${route}`);

for (const file of ['plans', 'referrals', 'safeErrorDetails', 'stripe', 'supabaseServer']) {
  const path = `lib/${file}.ts`;
  await copy(path, `source/${path}`);
}

await copy('package-lock.json');
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
manifest.scripts = { build: 'next build', start: 'next start' };
await writeFile(join(output, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');

const config = JSON.parse(await readFile(new URL('tsconfig.json', root), 'utf8'));
config.compilerOptions.paths['@/*'] = ['./source/*'];
await writeFile(join(output, 'tsconfig.json'), JSON.stringify(config, null, 2) + '\n');

console.log(output);
