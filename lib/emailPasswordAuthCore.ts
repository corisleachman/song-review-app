export const AUTH_EMAIL_MAX_LENGTH = 254;
export const AUTH_NAME_MAX_LENGTH = 80;
export const AUTH_PASSWORD_MIN_LENGTH = 12;
export const AUTH_PASSWORD_MAX_LENGTH = 128;
export const AUTH_CAPTCHA_TOKEN_MAX_LENGTH = 4096;

type AuthInputResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; field?: 'name' | 'email' | 'password' | 'captcha' };

type LoginInput = {
  email: string;
  password: string;
  destination: string | null;
  captchaToken: string;
};

type SignupInput = LoginInput & {
  name: string;
};

type ResendInput = {
  email: string;
  captchaToken: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readOptionalString(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > maxLength) return null;
  return value;
}

function readCaptchaToken(value: unknown) {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (!token || token.length > AUTH_CAPTCHA_TOKEN_MAX_LENGTH) return null;
  return token;
}

export function normalizeAuthEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidAuthEmail(value: string) {
  const email = normalizeAuthEmail(value);
  if (!email || email.length > AUTH_EMAIL_MAX_LENGTH) return false;
  if (/[\u0000-\u001f\u007f\s]/.test(email)) return false;
  return /^[^@]+@[^@]+\.[^@]+$/.test(email);
}

export function parseEmailLoginInput(input: unknown): AuthInputResult<LoginInput> {
  if (!isRecord(input)) return { ok: false, error: 'Invalid request.' };

  if (typeof input.email !== 'string' || !isValidAuthEmail(input.email)) {
    return { ok: false, error: 'Enter a valid email address.', field: 'email' };
  }
  if (
    typeof input.password !== 'string'
    || input.password.length < AUTH_PASSWORD_MIN_LENGTH
    || input.password.length > AUTH_PASSWORD_MAX_LENGTH
    || /[\u0000]/.test(input.password)
  ) {
    return {
      ok: false,
      error: `Password must be ${AUTH_PASSWORD_MIN_LENGTH} to ${AUTH_PASSWORD_MAX_LENGTH} characters.`,
      field: 'password',
    };
  }

  const destination = readOptionalString(input.destination, 1024);
  if (destination === null) return { ok: false, error: 'Invalid destination.' };
  const captchaToken = readCaptchaToken(input.captchaToken);
  if (!captchaToken) return { ok: false, error: 'Please complete the security check.', field: 'captcha' };

  return {
    ok: true,
    value: {
      email: normalizeAuthEmail(input.email),
      password: input.password,
      destination: destination ?? null,
      captchaToken,
    },
  };
}

export function parseEmailResendInput(input: unknown): AuthInputResult<ResendInput> {
  if (!isRecord(input)) return { ok: false, error: 'Invalid request.' };
  if (typeof input.email !== 'string' || !isValidAuthEmail(input.email)) {
    return { ok: false, error: 'Enter a valid email address.', field: 'email' };
  }
  const captchaToken = readCaptchaToken(input.captchaToken);
  if (!captchaToken) return { ok: false, error: 'Please complete the security check.', field: 'captcha' };

  return {
    ok: true,
    value: {
      email: normalizeAuthEmail(input.email),
      captchaToken,
    },
  };
}

export function parseEmailSignupInput(input: unknown): AuthInputResult<SignupInput> {
  if (!isRecord(input)) return { ok: false, error: 'Invalid request.' };

  if (typeof input.name !== 'string') {
    return { ok: false, error: 'Enter your name.', field: 'name' };
  }
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > AUTH_NAME_MAX_LENGTH || /[\u0000-\u001f\u007f]/.test(name)) {
    return { ok: false, error: `Name must be 2 to ${AUTH_NAME_MAX_LENGTH} characters.`, field: 'name' };
  }

  const loginInput = parseEmailLoginInput(input);
  if (loginInput.ok === false) {
    return { ok: false, error: loginInput.error, field: loginInput.field };
  }

  return {
    ok: true,
    value: {
      ...loginInput.value,
      name,
    },
  };
}
