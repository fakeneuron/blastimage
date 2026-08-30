import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

// eslint-config-next 16 ships native flat config, so these are spread directly
// rather than routed through `@eslint/eslintrc`'s FlatCompat as they were under
// v15 — the shim's eslintrc schema validation crashes on the v16 configs
// (DEPLOY-002).
const eslintConfig = [
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
    ],
  },
];

export default eslintConfig;
