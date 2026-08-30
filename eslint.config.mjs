import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // next/* already registers a thin jsx-a11y warn subset; recommended promotes
  // the full rule set to error so label / interaction regressions fail CI (BI-040).
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "plugin:jsx-a11y/recommended",
  ),
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
