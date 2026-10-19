// `@next/eslint-plugin-next` is CommonJS: default-import it, never destructure.
import next from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

// ESLint 10 flat config on natabula's Next template shape
// (`templates/nextjs/eslint.config.mjs`), composing `@next/eslint-plugin-next`
// directly instead of `eslint-config-next`. That package pulls in
// `eslint-plugin-react`, which crashes at rule load on ESLint 10
// (`context.getFilename` was removed; measured in DEPLOY-003), so dropping it
// is what unblocks the upgrade (DEPLOY-005).
//
// Type-checked rules (CORE-5): `recommendedTypeChecked` is typescript-eslint's
// `recommended` plus the type-aware half (`no-floating-promises`,
// `no-misused-promises`, `no-unsafe-*`). `tseslint.config()` is what expands
// `extends`. The preset registers the `@next/next` plugin itself, so do not
// also declare it in a `plugins` block.
const eslintConfig = tseslint.config(
  next.configs["core-web-vitals"],
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat["recommended-latest"],
      // Full recommended set at error severity, so label / interaction
      // regressions fail CI (BI-040).
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // typescript-eslint v8 already defaults caughtErrors to 'all'. Pinning
      // it keeps `catch (err) {}` reported if that default flips.
      "@typescript-eslint/no-unused-vars": ["error", { caughtErrors: "all" }],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      // Test doubles of Promise-returning seams are `async () => fixture`
      // with nothing to await. The rule stays on for source.
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      // Every `distDir` output: `.next/` (dev + prod builds), `.next-verify/`
      // (CORE-002's isolated verification build), and `.next-e2e/` (the
      // Playwright server, DEPLOY-008.3). Flat config does not auto-ignore
      // dot-directories, so each needs an explicit entry (BI-001).
      ".next/**",
      ".next-verify/**",
      ".next-e2e/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".flaitron/**",
      // Playwright output dirs (TEST-007.2). Gitignored, but a local
      // `npm run test:e2e` leaves them on disk and flat config would lint them.
      "playwright-report/**",
      "test-results/**",
      // Self-contained Astro stack with its own `astro check` (DEPLOY-011).
      "landing/**",
    ],
  },
);

export default eslintConfig;
