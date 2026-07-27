import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // OG images render through Satori (`next/og`), not the browser. Satori
    // supports a small JSX subset and has no concept of next/image — a raw
    // <img> is the only option there, so the LCP-oriented rule doesn't apply.
    files: ["**/opengraph-image.tsx", "**/twitter-image.tsx", "**/icon.tsx"],
    rules: { "@next/next/no-img-element": "off" },
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
