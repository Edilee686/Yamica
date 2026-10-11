import type { NextConfig } from "next";

// The studio is fully client-side (projects live in IndexedDB), so it can be
// served by `next start` or exported as static files with `output: "export"`.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: process.env.STATIC_EXPORT ? "export" : undefined,
  // Static hosts serve /studio/ as studio/index.html.
  trailingSlash: !!process.env.STATIC_EXPORT,
  // e.g. NEXT_PUBLIC_BASE_PATH=/yamica-studio for a GitHub Pages project site.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
