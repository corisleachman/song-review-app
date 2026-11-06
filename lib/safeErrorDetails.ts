// Never copy provider messages, stacks, causes, URLs, headers or bodies to logs.
// Keep only known operational codes and an integer HTTP status for correlation
// with the platform's request ID and the caller's existing fixed log label.
const SAFE_ERROR_CODES = new Set([
  '23502', '23503', '23505', '23514', '40001', '40P01', '42501',
  '42703', '42P01', '42P17', '53300', '57014', 'P0001',
  'PGRST116', 'PGRST202', 'PGRST204', 'PGRST205', 'PGRST301', 'PGRST302',
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN',
  'ABORT_ERR', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT',
  'resource_missing', 'rate_limit', 'invalid_api_key', 'api_key_expired',
  'invalid_credentials', 'bad_jwt', 'session_not_found',
]);

type SafeErrorDetails = {
  kind: 'exception' | 'provider_error' | 'unknown';
  code?: string;
  status?: number;
};

export function safeErrorDetails(error: unknown): SafeErrorDetails {
  try {
    if (!error || typeof error !== 'object') return { kind: 'unknown' };
    const result: SafeErrorDetails = {
      kind: error instanceof Error ? 'exception' : 'provider_error',
    };
    // Read data properties only. Logging must not invoke custom getters/toJSON
    // or throw while the handler is already recovering from another failure.
    const code = Object.getOwnPropertyDescriptor(error, 'code')?.value;
    if (typeof code === 'string' && SAFE_ERROR_CODES.has(code)) result.code = code;
    const status = Object.getOwnPropertyDescriptor(error, 'status')?.value
      ?? Object.getOwnPropertyDescriptor(error, 'statusCode')?.value;
    if (typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599) {
      result.status = status;
    }
    return result;
  } catch {
    return { kind: 'unknown' };
  }
}
