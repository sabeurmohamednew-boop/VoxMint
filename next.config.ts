import type { NextConfig } from "next";

export function securityHeadersForEnvironment(nodeEnv: string) {
  const production = nodeEnv === "production";
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://lh3.googleusercontent.com",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    `connect-src 'self'${production ? "" : " ws://localhost:* ws://127.0.0.1:*"}`,
    "worker-src 'self' blob:",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(), payment=()" },
    ...(production
      ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
      : []),
  ];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  serverExternalPackages: ["file-type", "music-metadata"],
  async redirects() {
    return [{ source: "/billing", destination: "/status", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeadersForEnvironment(process.env.NODE_ENV ?? "development"),
      },
    ];
  },
};

export default nextConfig;
