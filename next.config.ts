import type { NextConfig } from "next";

/** Build once; serve as static HTML/CSS/JS. No API routes or Node server. */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
