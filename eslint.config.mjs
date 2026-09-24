import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

// eslint-config-next 16 ships native flat config, so these are spread directly
// rather than routed through `@eslint/eslintrc`'s FlatCompat as they were under
// v15 — the shim's eslintrc schema validation crashes on the v16 configs
// (DEPLOY-002).
//
// Type-checked rules sit on that base (CORE-5). `eslint-config-next/typescript`
// already spreads typescript-eslint `recommended` and registers the plugin, so
// the full `recommendedTypeChecked` array would register `@typescript-eslint`
// twice. `recommendedTypeCheckedOnly` is the type-aware half
// (`no-floating-promises`, `no-misused-promises`, `no-unsafe-*`) meant to
// layer on. ESLint stays on 9: DEPLOY-005, `eslint-plugin-react` has no
// ESLint 10 release. `tseslint.config()` is what expands `extends`.
const eslintConfig = tseslint.config(
  ...nextCoreWebVitals,
  ...nextTypescript,
  // next/* already registers a thin jsx-a11y warn subset; recommended promotes
  // the full rule set to error so label / interaction regressions fail CI (BI-040).
  // Rules only — spreading the whole flat config would re-register the `jsx-a11y`
  // plugin namespace that eslint-config-next already owns, which flat config
  // rejects outright. Both resolve the same hoisted plugin (DEPLOY-002).
  {
    name: "jsx-a11y/recommended (rules)",
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommendedTypeCheckedOnly],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // typescript-eslint v8 already defaults caughtErrors to 'all'. Pinning
      // it keeps `catch (err) {}` reported if that default flips. An options
      // object replaces next's warn-level copy of this rule for TS files.
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
      // Both `distDir` outputs: `.next/` (dev + prod builds) and `.next-verify/`
      // (CORE-002's isolated verification build). Flat config does not
      // auto-ignore dot-directories, so each needs an explicit entry (BI-001).
      ".next/**",
      ".next-verify/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".flowtron/**",
      // Playwright output dirs (TEST-007.2). Gitignored, but a local
      // `npm run e2e` leaves them on disk and flat config would lint them.
      "playwright-report/**",
      "test-results/**",
    ],
  },
);

export default eslintConfig;
