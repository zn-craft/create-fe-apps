import { defineConfig } from "eslint/config";
import jseslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const ignores = ["**/dist/**", "**/node_modules/**", ".*", "**/*.d.ts"];

export default defineConfig(
  // 通用配置
  {
    ignores,
    extends: [jseslint.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier],
    plugins: {
      prettier: eslintPluginPrettier
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tseslint.parser
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
      "prettier/prettier": "warn"
    }
  },
  // 前端配置
  {
    ignores,
    files: ["apps/web/**/*.{ts,js,tsx,jsx}", "apps/mobile/**/*.{ts,js,tsx,jsx}", "packages/ui/**/*.{ts,js,tsx,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  // 后端配置
  {
    ignores,
    files: ["apps/server/**/*.{ts,js}", "packages/utils/**/*.{ts,js}"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  // CommonJS 配置文件（stylelint.config.cjs 这类）需要 CommonJS 的全局变量
  {
    ignores,
    files: ["**/*.cjs"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
);
