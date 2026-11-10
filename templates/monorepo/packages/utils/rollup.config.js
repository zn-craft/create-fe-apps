import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { terser } from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";

// 主构建配置
const config = {
  input: "src/index.ts",
  output: [
    {
      file: "dist/esm/index.js",
      format: "esm",
      sourcemap: true
    },
    {
      file: "dist/cjs/index.cjs",
      format: "cjs",
      sourcemap: true
    }
  ],
  external: [], // 按需添加外部依赖
  plugins: [
    // 解析 node_modules 中的模块
    resolve({
      extensions: [".js", ".jsx", ".ts", ".tsx"]
    }),

    // 将 CommonJS 模块转换为 ES6
    commonjs(),

    // TypeScript 支持
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: false
    }),

    // 生产环境压缩
    terser()
  ]
};

// 类型声明生成配置
const dtsConfig = {
  input: "src/index.ts",
  output: {
    file: "dist/types/index.d.ts",
    format: "es"
  },
  plugins: [dts()]
};

export default [config, dtsConfig];
