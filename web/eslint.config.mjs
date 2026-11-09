import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "sonner", message: "Use notify from '@/lib/notify' so every toast follows the standard." }],
        },
      ],
    },
  },
  {
    files: ["lib/notify.ts", "components/ui/sonner.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["components/ui/**"],
    rules: { "react-hooks/purity": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
