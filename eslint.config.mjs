import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// tsconfig.json 的 include 覆盖的源码范围，类型感知规则只对这几类文件生效。
const TS_FILES = ['src/**/*.ts', 'scripts/**/*.ts', 'tsup.config.ts'];

export default [
  {
    // 不检查构建产物、依赖目录、Husky 内部目录，以及脚手架模板目录。
    ignores: [
      'dist/**',
      'node_modules/**',
      '.husky/_/**',
      'templates/**',
      '.pnpm-store/**',
      '.agents/**',
    ],
  },
  // ESLint 官方提供的基础推荐规则。
  js.configs.recommended,
  // TypeScript 基础规则先全局接入，但不要求类型信息。
  ...tseslint.configs.recommended,
  {
    // 这层是所有 JS/TS 源文件共享的基础语言配置。
    files: ['**/*.{js,cjs,mjs,ts}'],
    languageOptions: {
      // 按最新 ECMAScript 语法解析源码。
      ecmaVersion: 'latest',
      globals: {
        // 注入 Node.js 全局变量，避免 process、__dirname 等被误报。
        ...globals.node,
      },
    },
  },
  {
    // .cjs 文件显式按 CommonJS 处理。
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
  {
    // 其余 JS/TS 源文件按 ESM 源码语义处理。
    files: ['**/*.{js,mjs,ts}'],
    languageOptions: {
      sourceType: 'module',
    },
  },
  // 仅对 TypeScript 文件启用“带类型信息”的推荐规则集。
  // flat config 不支持在配置对象里写 extends，需要把预设本身铺进数组。
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: TS_FILES,
  })),
  {
    files: TS_FILES,
    languageOptions: {
      parserOptions: {
        // 通过 TS Project Service 自动关联当前项目的 tsconfig。
        projectService: true,
        // 固定 tsconfig 的根目录，避免从其他 cwd 执行时解析错误。
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // 类型导入统一使用 import type，减少类型与运行时依赖混用。
      '@typescript-eslint/consistent-type-imports': 'error',
      // 禁止悬空 Promise，避免异步错误被静默丢失。
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    // CLI 入口依赖 console 输出，这里按场景关闭限制。
    files: ['src/index.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
