import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for Catalyst AppSail (node server.js).
  // better-sqlite3's native binding is traced in; build MUST run on linux
  // (GitHub Action) so the .node binary matches the AppSail runtime.
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["node_modules/better-sqlite3/build/**"],
  },
};

export default nextConfig;
