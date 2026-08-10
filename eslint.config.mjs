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
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".flowtron/**",
    ],
  },
];

export default eslintConfig;
