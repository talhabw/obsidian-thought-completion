import tsparser from "@typescript-eslint/parser";
import tseslint from "@typescript-eslint/eslint-plugin";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { 
        project: "./tsconfig.json",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "obsidianmd": obsidianmd,
    },
    rules: {
      // Obsidian recommended rules
      ...obsidianmd.configs.recommended,
      // TypeScript rules
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
];
