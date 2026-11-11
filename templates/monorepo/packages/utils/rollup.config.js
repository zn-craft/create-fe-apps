import { readFileSync } from "node:fs";

import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";

// 自身声明的依赖一律外部化（含 peerDependencies）。
// 库内联兄弟包或第三方库会造出隐藏副本，消费者既没法去重也没法升级。
// 依赖写进 package.json 的 dependencies，就会自动出现在这里。
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const external = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})];

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
  external,
  plugins: [
    // 解析 node_modules 中的模块
    resolve({
      extensions: [".js", ".jsx", ".ts", ".tsx"]
    }),

    // 将 CommonJS 模块转换为 ES6
    commonjs(),

    // TypeScript 转译：声明文件由下面的 dts 配置单独产出，所以这里连同
    // declarationMap 一起关掉，避免继承根 tsconfig 的声明相关选项。
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: false,
      declarationMap: false
    }),

    // 生产环境压缩
    terser()
  ]
};

// 类型声明生成配置
const dtsConfig = {
  input: "src/index.ts",
  external,
  output: {
    file: "dist/types/index.d.ts",
    format: "es"
  },
  plugins: [dts()]
};

export default [config, dtsConfig];
