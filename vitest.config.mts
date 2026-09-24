import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// happy-dom gives unit tests a browser-like `window` / `localStorage`, which
// the persistence layer (lib/storage.ts) exercises.
//
// The include glob covers `components/` and `.tsx` as well as `lib/`: it was
// `lib/**/*.test.ts` until TEST-001.2, which meant a component test could not
// be discovered at all — the lib-only testing culture (BI-021.3) was being
// enforced by config rather than chosen. Components import through the `@/`
// alias, so tests need it resolved here; tsconfig `paths` is not read by Vite.
export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["{lib,components}/**/*.test.{ts,tsx}"],
    // `include` is what puts a never-imported module in the lcov report at 0%
    // so the changed-line gate can see it (NAT-229). Tests are colocated, so
    // they are excluded — the gate covers source, not the tests themselves.
    coverage: {
      provider: "v8",
      reporter: ["text", "lcovonly"],
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
      ],
      exclude: ["**/*.test.{ts,tsx}"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  // tsconfig sets `jsx: "preserve"` (Next compiles JSX itself), and Vite does
  // not read tsconfig for the transform — so component tests need the runtime
  // named here or `.tsx` fails to parse.
  oxc: {
    jsx: { runtime: "automatic" },
  },
});
