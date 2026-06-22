import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // A package-lock.json exists in the parent (home) directory; pin the workspace
  // root to this project so Next infers paths correctly.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
