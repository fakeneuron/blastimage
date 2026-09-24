import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `AGENTS.md` is this repo's hand-authored, agent-neutral SSOT (see
  // `.flowtron/tasknote/README.md` §"AI-referenced docs"). Next 16's
  // `agentRules` otherwise appends its own delimited block to it on every
  // `next dev`, which both takes editorial control of a curated doc and
  // re-dirties the working tree at the start of every task (DEPLOY-002).
  agentRules: false,
  ...(process.env.NEXT_VERIFY_BUILD ? { distDir: ".next-verify" } : {}),
  // The Playwright webServer's own `next dev` (DEPLOY-008.3). Next 16 holds one
  // dev lock per `distDir`, so sharing `.next/` with `just dev` refused to start.
  ...(process.env.NEXT_E2E_BUILD ? { distDir: ".next-e2e" } : {}),
};

export default nextConfig;
