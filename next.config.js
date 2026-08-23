const CSP_REPORT_ENDPOINT = '/api/csp-report';
const CSP_REPORT_GROUP = 'csp-endpoint';

function getSupabaseBrowserSources() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!configuredUrl) {
    return {
      http: 'https://*.supabase.co',
      websocket: 'wss://*.supabase.co',
    };
  }

  try {
    const url = new URL(configuredUrl);
    const websocketProtocol = url.protocol === 'http:' ? 'ws:' : 'wss:';

    return {
      http: url.origin,
      websocket: `${websocketProtocol}//${url.host}`,
    };
  } catch {
    // A malformed public Supabase URL will already fail the application build.
    // Keep the header valid so its own error does not hide that root cause.
    return {
      http: 'https://*.supabase.co',
      websocket: 'wss://*.supabase.co',
    };
  }
}

function buildReportOnlyPolicy(frameAncestors) {
  const supabase = getSupabaseBrowserSources();
  const developmentScriptSources = process.env.NODE_ENV === 'development'
    ? ["'unsafe-eval'"]
    : [];
  const directives = [
    ['default-src', "'self'"],
    ['base-uri', "'self'"],
    ['object-src', "'none'"],
    ['frame-ancestors', frameAncestors],
    ['form-action', "'self'"],
    [
      'script-src',
      "'self'",
      "'unsafe-inline'",
      ...developmentScriptSources,
      'https://www.googletagmanager.com',
    ],
    ['script-src-attr', "'none'"],
    ['style-src', "'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    [
      'font-src',
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
      'https://raw.githubusercontent.com',
      'https://corisleachman.github.io',
    ],
    [
      'img-src',
      "'self'",
      'data:',
      'blob:',
      supabase.http,
      'https://*.googleusercontent.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://www.googletagmanager.com',
      'https://raw.githubusercontent.com',
      'https://corisleachman.github.io',
    ],
    [
      'media-src',
      "'self'",
      'blob:',
      supabase.http,
      'https://corisleachman.github.io',
    ],
    [
      'connect-src',
      "'self'",
      supabase.http,
      supabase.websocket,
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://*.googletagmanager.com',
    ],
    ['worker-src', "'self'", 'blob:'],
    ['frame-src', "'none'"],
    ['manifest-src', "'self'"],
    ['report-uri', CSP_REPORT_ENDPOINT],
    ['report-to', CSP_REPORT_GROUP],
  ];

  return directives.map((directive) => `${directive.join(' ')};`).join(' ');
}

function reportOnlyHeaders(frameAncestors) {
  return [
    {
      key: 'Content-Security-Policy-Report-Only',
      value: buildReportOnlyPolicy(frameAncestors),
    },
    {
      key: 'Reporting-Endpoints',
      value: `${CSP_REPORT_GROUP}="${CSP_REPORT_ENDPOINT}"`,
    },
  ];
}

// Applied to every route EXCEPT /embed/* (see embedHeaders below). The negative
// lookahead in the source keeps X-Frame-Options: DENY off the embed routes so a
// single, consistent framing policy is expressed via CSP frame-ancestors there.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  ...reportOnlyHeaders("'none'"),
];

// Applied to /embed/* only. Identical to securityHeaders but WITHOUT
// X-Frame-Options (legacy header that would block framing and can conflict with
// CSP), and WITH frame-ancestors so the embeddable player can be iframed on any
// third-party site. X-Frame-Options is intentionally omitted rather than set,
// because when both headers are present browser behaviour is inconsistent.
const embedHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
  ...reportOnlyHeaders('*'),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Sharp ships native (.node) binaries per-platform. Next.js's default
  // webpack bundling for API routes can fail to carry that native binary
  // into the serverless function bundle, which surfaces at runtime as
  // `Could not load the "sharp" module using the linux-x64 runtime`.
  // Marking it external tells Next.js to leave it alone at build time and
  // require() it directly from node_modules at runtime instead.
  serverExternalPackages: ['sharp'],
  async headers() {
    return [
      {
        // Everything except /embed/* keeps the strict framing policy.
        source: '/((?!embed).*)',
        headers: securityHeaders,
      },
      {
        // Embeddable player routes: frameable anywhere.
        source: '/embed/:path*',
        headers: embedHeaders,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/marketing.html' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

module.exports = nextConfig;
