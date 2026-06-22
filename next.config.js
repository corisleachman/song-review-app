/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sharp ships native (.node) binaries per-platform. Next.js's default
  // webpack bundling for API routes can fail to carry that native binary
  // into the serverless function bundle, which surfaces at runtime as
  // `Could not load the "sharp" module using the linux-x64 runtime`.
  // Marking it external tells Next.js to leave it alone at build time and
  // require() it directly from node_modules at runtime instead.
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
};

module.exports = nextConfig;
