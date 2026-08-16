// Applied to every route EXCEPT /embed/* (see embedHeaders below). The negative
// lookahead in the source keeps X-Frame-Options: DENY off the embed routes so a
// single, consistent framing policy is expressed via CSP frame-ancestors there.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
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
