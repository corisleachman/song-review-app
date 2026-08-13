const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
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
        source: '/:path*',
        headers: securityHeaders,
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
