import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_REPORT_BYTES = 16 * 1024;
const MAX_REPORTS_PER_REQUEST = 10;
const ACCEPTED_CONTENT_TYPES = new Set([
  'application/csp-report',
  'application/reports+json',
]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function limitedText(value: unknown, maxLength = 200): string | null {
  return typeof value === 'string' && value.length > 0
    ? value.slice(0, maxLength)
    : null;
}

function sanitizedUrl(value: unknown): string | null {
  const text = limitedText(value, 1000);
  if (!text) return null;

  if (['inline', 'eval', 'data', 'blob'].includes(text)) return text;

  try {
    const url = new URL(text);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return url.protocol.slice(0, 20);
    }

    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return text.slice(0, 200);
  }
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function reportBody(value: unknown): UnknownRecord | null {
  if (!isRecord(value)) return null;
  if (isRecord(value['csp-report'])) return value['csp-report'];
  if (value.type === 'csp-violation' && isRecord(value.body)) return value.body;
  return value;
}

function normalizedReport(value: unknown) {
  const body = reportBody(value);
  if (!body) return null;

  return {
    disposition: limitedText(body.disposition, 20),
    effectiveDirective: limitedText(
      body.effectiveDirective ?? body['effective-directive'],
      80,
    ),
    violatedDirective: limitedText(
      body.violatedDirective ?? body['violated-directive'],
      80,
    ),
    blockedUrl: sanitizedUrl(body.blockedURL ?? body['blocked-uri']),
    documentUrl: sanitizedUrl(body.documentURL ?? body['document-uri']),
    sourceFile: sanitizedUrl(body.sourceFile ?? body['source-file']),
    statusCode: numberOrNull(body.statusCode ?? body['status-code']),
    lineNumber: numberOrNull(body.lineNumber ?? body['line-number']),
    columnNumber: numberOrNull(body.columnNumber ?? body['column-number']),
  };
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REPORT_BYTES) {
    return NextResponse.json({ ok: false, error: 'Report is too large.' }, { status: 413 });
  }

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (!contentType || !ACCEPTED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json({ ok: false, error: 'Unsupported report type.' }, { status: 415 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_REPORT_BYTES) {
    return NextResponse.json({ ok: false, error: 'Report is too large.' }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid report.' }, { status: 400 });
  }

  const submittedReports = Array.isArray(payload) ? payload : [payload];
  const reports = submittedReports
    .slice(0, MAX_REPORTS_PER_REQUEST)
    .map(normalizedReport)
    .filter((report) => report !== null);

  if (reports.length === 0) {
    return NextResponse.json({ ok: false, error: 'Invalid report.' }, { status: 400 });
  }

  for (const report of reports) {
    // Intentionally omit original-policy, script-sample, query strings, and hashes.
    // Vercel runtime logs are the temporary observation surface for this rollout.
    console.warn('[csp-report]', JSON.stringify(report));
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
