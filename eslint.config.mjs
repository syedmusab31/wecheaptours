import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "coverage/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      eqeqeq: ["error", "smart"],
      "no-console": "warn",
      // Apostrophes in JSX text render fine; escaping them hurts readability.
      "react/no-unescaped-entities": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='sql'][property.name='raw']",
          message: "sql.raw splices text into SQL. Use a bound parameter: sql`... ${value} ...`.",
        },
        {
          selector:
            "MemberExpression[object.type='MemberExpression'][object.object.name='process'][object.property.name='env'][property.name!=/^(NEXT_PUBLIC_.+|NODE_ENV)$/]",
          message: "Read server settings from `env` (src/config/env.ts), which validates them.",
        },
      ],
    },
  },
  // Architecture boundaries (docs: Phase 2.1). Only repositories talk to the database.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/features/*/server/*.repository.ts", "src/server/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/server/db/client",
              allowTypeImports: true,
              message: "Only repositories (features/*/server/*.repository.ts) may use the database client.",
            },
          ],
          patterns: [
            { group: ["drizzle-orm", "drizzle-orm/*"], message: "Database queries belong in a repository." },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/app/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/features/*/components/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@/server/db/client", message: "Pages and components call services, not the database." },
          ],
          patterns: [
            { group: ["drizzle-orm", "drizzle-orm/*"], message: "Database queries belong in a repository." },
            {
              group: ["@/features/*/server/*.repository"],
              message: "Import the feature's service instead of its repository.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/*/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*"],
              allowTypeImports: true,
              message: "Domain code is pure: no database, email or HTTP (type imports are fine).",
            },
            { group: ["next", "next/*", "react", "react-dom"], message: "Domain code is framework-free." },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/config/**",
      "next.config.ts",
      "tests/**",
      "scripts/**",
      "vitest.config.ts",
      "drizzle.config.ts",
    ],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    files: ["scripts/**", "src/server/db/migrate.ts"],
    rules: { "no-console": "off" },
  },
);
