import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_VERIFY_BUILD ? { distDir: ".next-verify" } : {}),
};

export default nextConfig;
