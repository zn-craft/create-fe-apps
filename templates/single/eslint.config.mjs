import { defineConfig } from "eslint/config";
import jseslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const ignores = ["**/dist/**", "**/node_modules/**", ".*", "**/*.d.ts"];

export default defineConfig({
  ignores,
  extends: [jseslint.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier],
  plugins: {
    prettier: eslintPluginPrettier
  },
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parser: tseslint.parser,
    globals: {
      ...globals.node
    }
  },
  rules: {
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/consistent-type-imports": "error",
    "prettier/prettier": "warn"
  }
});
