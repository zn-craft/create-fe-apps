import { defineConfig } from "eslint/config";
import jseslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier/flat";

// 用 .mjs 是因为项目是 "type": "module"，flat config 需要按 ESM 解析。
// 这里列出的路径不参与检查：构建产物、依赖目录、隐藏目录和类型声明文件。
const ignores = ["**/dist/**", "**/node_modules/**", ".*", "**/*.d.ts"];

export default defineConfig(
  // 通用配置：所有文件都适用的基础规则。
  // eslint-config-prettier 放在最后，用来关掉与 Prettier 冲突的格式化规则。
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
  // 前端配置：浏览器包注入浏览器全局变量。
  // 匹配不到的路径不会报错，所以某个子包被勾选掉时这段自然失效，不用改配置。
  {
    ignores,
    files: ["apps/web/**/*.{ts,js,tsx,jsx}", "apps/mobile/**/*.{ts,js,tsx,jsx}", "packages/ui/**/*.{ts,js,tsx,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  // 后端配置：Node 包注入 Node 全局变量。
  {
    ignores,
    files: ["apps/server/**/*.{ts,js}", "packages/utils/**/*.{ts,js}"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  // CommonJS 配置文件（stylelint.config.cjs 这类）需要 CommonJS 的全局变量，
  // 否则 module / require 会被 no-undef 判成未定义。
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
