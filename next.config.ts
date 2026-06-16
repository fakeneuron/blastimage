import type { NextConfig } from "next";

// Cloudflare Pages ships a static export of blastimage (the app is fully
// client-rendered — no RSC data work, API routes, or route handlers — so it
// qualifies for `output: 'export'` with no edge-worker/next-on-pages layer).
//
// Gated on BUILD_TARGET=cloudflare so the default `next build` / `next dev` and
// submodule adopters stay on the standard server build. See docs/DEPLOY.md.
const isCloudflareBuild = process.env.BUILD_TARGET === "cloudflare";

const nextConfig: NextConfig = isCloudflareBuild
  ? {
      output: "export",
      // Next's image optimizer needs a server; a static export can't run it.
      // The app renders images with plain <img> (data: / bucket URLs), so this
      // is a no-op today and a guard if next/image is ever introduced.
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
