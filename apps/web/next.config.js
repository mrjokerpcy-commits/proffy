/** @type {import("next").NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-XSS-Protection",          value: "1; mode=block" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Tell crawlers/bots not to index private app pages
  { key: "X-Robots-Tag",              value: "noindex, nofollow", },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' required for Next.js SSR hydration; 'unsafe-eval' removed
      "script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.paypalobjects.com https://checkout.paypal.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.paypalobjects.com",
      "font-src 'self' https://fonts.gstatic.com https://www.paypalobjects.com data:",
      "img-src 'self' blob: data: https:",
      "connect-src 'self' https://api.anthropic.com https://api.openai.com https://www.paypal.com https://api-m.sandbox.paypal.com https://api-m.paypal.com",
      "frame-src https://www.paypal.com https://checkout.paypal.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

// Public pages that should be indexable by search engines
const publicHeaders = [
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-XSS-Protection",          value: "1; mode=block" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Robots-Tag",              value: "index, follow" },
];

const nextConfig = {
  async headers() {
    return [
      // Security headers on everything
      { source: "/(.*)", headers: securityHeaders },
      // Override robots tag for public marketing pages
      { source: "/",            headers: publicHeaders },
      { source: "/pricing",     headers: publicHeaders },
      { source: "/login",       headers: publicHeaders },
      { source: "/register",    headers: publicHeaders },
    ];
  },
  poweredByHeader: false,
  output: "standalone",
};

module.exports = nextConfig;
