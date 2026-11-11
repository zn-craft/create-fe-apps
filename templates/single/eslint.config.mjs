import { defineConfig } from "eslint/config";
import jseslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier/flat";

// 用 .mjs 是因为项目是 "type": "module"，flat config 需要按 ESM 解析。
// 这里列出的路径不参与检查：构建产物、依赖目录、隐藏目录和类型声明文件。
const ignores = ["**/dist/**", "**/node_modules/**", ".*", "**/*.d.ts"];

export default defineConfig({
  ignores,
  // ESLint 官方推荐 + typescript-eslint 推荐，最后用 eslint-config-prettier
  // 关掉所有与 Prettier 冲突的格式化规则，避免两套工具互相打架。
  extends: [jseslint.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier],
  plugins: {
    // 把 Prettier 的问题作为 lint 报出来，让 format:check 之外也有一层提示。
    prettier: eslintPluginPrettier
  },
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    // 用 TypeScript 解析器，.ts 文件才能被正确解析。
    parser: tseslint.parser,
    // 单体形态默认按 Node 环境；改浏览器项目时换成 globals.browser。
    globals: {
      ...globals.node
    }
  },
  rules: {
    // 未使用的变量只警告，不阻断开发。
    "@typescript-eslint/no-unused-vars": "warn",
    // 类型导入统一写 import type，避免把类型带进运行时产物。
    "@typescript-eslint/consistent-type-imports": "error",
    "prettier/prettier": "warn"
  }
});
