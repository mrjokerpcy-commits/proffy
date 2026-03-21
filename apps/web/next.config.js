/** @type {import("next").NextConfig} */
const securityHeaders = [
  // Prevent MIME type sniffing
  { key: "X-Content-Type-Options",   value: "nosniff" },
  // Deny framing (clickjacking)
  { key: "X-Frame-Options",          value: "DENY" },
  // XSS filter for legacy browsers
  { key: "X-XSS-Protection",         value: "1; mode=block" },
  // Limit referrer info sent cross-origin
  { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
  // Permissions policy — deny features we don't use
  { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=()" },
  // HSTS — 1 year, include subdomains
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js needs inline scripts for hydration; nonces are ideal but complex — use 'unsafe-inline' for now
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com https://www.paypalobjects.com https://checkout.paypal.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.paypalobjects.com",
      "font-src 'self' https://fonts.gstatic.com https://www.paypalobjects.com data:",
      "img-src 'self' blob: data: https:",
      "connect-src 'self' https://api.anthropic.com https://api.openai.com https://www.paypal.com https://api-m.sandbox.paypal.com https://api-m.paypal.com",
      "frame-src https://www.paypal.com https://checkout.paypal.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // Prevent Next.js from exposing powered-by header
  poweredByHeader: false,
};

module.exports = nextConfig;
