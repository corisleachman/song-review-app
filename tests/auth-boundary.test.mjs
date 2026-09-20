import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destinationModule = await import(pathToFileURL(path.join(repoRoot, 'lib/authDestination.ts')).href);
const intentModule = await import(pathToFileURL(path.join(repoRoot, 'lib/authIntentCore.ts')).href);
const emailPasswordModule = await import(
  pathToFileURL(path.join(repoRoot, 'lib/emailPasswordAuthCore.ts')).href
);

const {
  normalizeAuthDestination,
  resolveAuthDestination,
} = destinationModule;
const {
  AUTH_INTENT_TTL_SECONDS,
  authIntentEmailMatches,
  hashAuthIntentEmail,
  sealAuthIntent,
  unsealAuthIntent,
} = intentModule;
const {
  isValidAuthEmail,
  normalizeAuthEmail,
  parseEmailLoginInput,
  parseEmailResendInput,
  parseEmailSignupInput,
} = emailPasswordModule;

test('auth destinations allow only named Song Room journeys', () => {
  assert.equal(normalizeAuthDestination('/dashboard'), '/dashboard');
  assert.equal(normalizeAuthDestination('/settings/referrals'), '/settings/referrals');
  assert.equal(normalizeAuthDestination('/songs/song_1/upload'), '/songs/song_1/upload');
  assert.equal(
    normalizeAuthDestination('/songs/song_1/versions/version_2'),
    '/songs/song_1/versions/version_2',
  );
  assert.deepEqual(resolveAuthDestination('/invite/12345678-1234-1234-1234-123456789abc'), {
    kind: 'invite',
    path: '/invite/12345678-1234-1234-1234-123456789abc',
  });
  assert.equal(
    normalizeAuthDestination('/upgrade?plan=pro&billing=month&source=pricing'),
    '/upgrade?plan=pro&billing=month&source=pricing',
  );
});

test('auth destinations reject external, malformed, and unsupported targets', () => {
  const rejected = [
    'https://attacker.example/steal',
    '//attacker.example/steal',
    '/songs/song_1?admin=true',
    '/settings/not-real',
    '/upgrade?plan=pro&billing=month&source=pricing&next=https://attacker.example',
    '/dashboard#fragment',
    '/dashboard\\attacker',
  ];

  for (const value of rejected) {
    assert.equal(normalizeAuthDestination(value), '/dashboard', value);
  }
});

test('sealed auth intents survive valid cross-device continuation', () => {
  const now = 2_000_000_000;
  const secret = 'staging-auth-intent-secret-that-is-long-and-random';
  const emailHash = hashAuthIntentEmail(' Person@Example.com ');
  const token = sealAuthIntent({
    purpose: 'signup',
    destination: { kind: 'paid_plan', path: '/upgrade?plan=pro&billing=year&source=pricing' },
    referralCode: 'REF_123',
    emailHash,
  }, secret, now);

  const payload = unsealAuthIntent(token, secret, now + 30);
  assert.ok(payload);
  assert.equal(payload.purpose, 'signup');
  assert.equal(payload.destination.kind, 'paid_plan');
  assert.equal(payload.referralCode, 'REF_123');
  assert.equal(authIntentEmailMatches(payload, 'person@example.com'), true);
  assert.equal(authIntentEmailMatches(payload, 'someone-else@example.com'), false);
});

test('sealed auth intents reject tampering, wrong secrets, and expiry', () => {
  const now = 2_000_000_000;
  const secret = 'staging-auth-intent-secret-that-is-long-and-random';
  const token = sealAuthIntent({
    purpose: 'login',
    destination: { kind: 'dashboard', path: '/dashboard' },
  }, secret, now);
  const tokenParts = token.split('.');
  const firstCiphertextCharacter = tokenParts[2][0];
  tokenParts[2] = `${firstCiphertextCharacter === 'A' ? 'B' : 'A'}${tokenParts[2].slice(1)}`;
  const tampered = tokenParts.join('.');

  assert.equal(unsealAuthIntent(tampered, secret, now + 1), null);
  assert.equal(
    unsealAuthIntent(token, 'different-auth-intent-secret-that-is-also-long', now + 1),
    null,
  );
  assert.equal(unsealAuthIntent(token, secret, now + AUTH_INTENT_TTL_SECONDS), null);
});

test('auth intent secrets fail closed when too short', () => {
  assert.throws(
    () => sealAuthIntent({
      purpose: 'login',
      destination: { kind: 'dashboard', path: '/dashboard' },
    }, 'too-short'),
    /at least 32 characters/,
  );
});

test('email auth input normalizes identifiers and preserves password characters', () => {
  const parsed = parseEmailLoginInput({
    email: ' Person@Example.com ',
    password: '  long passphrase  ',
    destination: '/dashboard',
    captchaToken: 'captcha-result',
  });

  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.email, 'person@example.com');
  assert.equal(parsed.value.password, '  long passphrase  ');
  assert.equal(parsed.value.captchaToken, 'captcha-result');
  assert.equal(normalizeAuthEmail(' Person@Example.com '), 'person@example.com');
  assert.equal(isValidAuthEmail('person@example.com'), true);
});

test('email signup validates name, email, and a 12-character password server-side', () => {
  const valid = parseEmailSignupInput({
    name: '  Alex   Rivers ',
    email: 'alex@example.com',
    password: 'a useful passphrase',
    destination: '/songs/song_1',
    captchaToken: 'captcha-result',
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.value.name, 'Alex Rivers');

  assert.equal(parseEmailSignupInput({
    name: 'A',
    email: 'alex@example.com',
    password: 'a useful passphrase',
    captchaToken: 'captcha-result',
  }).ok, false);
  assert.equal(parseEmailSignupInput({
    name: 'Alex Rivers',
    email: 'not-an-email',
    password: 'a useful passphrase',
    captchaToken: 'captcha-result',
  }).ok, false);
  assert.equal(parseEmailSignupInput({
    name: 'Alex Rivers',
    email: 'alex@example.com',
    password: 'too-short',
    captchaToken: 'captcha-result',
  }).ok, false);
});

test('email auth rejects missing or oversized Turnstile tokens', () => {
  const login = {
    email: 'alex@example.com',
    password: 'a useful passphrase',
    destination: '/dashboard',
  };

  assert.deepEqual(parseEmailLoginInput(login), {
    ok: false,
    error: 'Please complete the security check.',
    field: 'captcha',
  });
  assert.equal(parseEmailLoginInput({
    ...login,
    captchaToken: 'x'.repeat(4097),
  }).ok, false);
  assert.equal(parseEmailResendInput({ email: 'alex@example.com' }).ok, false);
});

test('verification resend validates email without accepting password data', () => {
  const valid = parseEmailResendInput({
    email: ' Listener@Example.com ',
    captchaToken: 'captcha-result',
    password: 'must-not-be-used',
  });
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.value, {
    email: 'listener@example.com',
    captchaToken: 'captcha-result',
  });
  assert.equal(parseEmailResendInput({ email: 'invalid' }).ok, false);
});
