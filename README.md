# create-fe-apps

[English](./README.en.md) | **简体中文**

一条命令生成配置齐全的项目骨架，两种形态任选：**单体**（单包工程）和**多体**（`apps/*` + `packages/*` 的 Monorepo）。两种形态都自带 ESLint 9 flat config、Prettier、Stylelint、TypeScript 严格模式、Husky + lint-staged。

```bash
npm create fe-apps
```

---

## 快速开始

在你放项目的目录下执行 `npm create fe-apps`（或 `npx create-fe-apps`），一路回车走默认值，得到完整的 Monorepo：

```
? Please enter the project folder name: (my-project)
? Which project layout do you want?
> Monorepo (apps + packages)
  Single package
? Which subpackages do you want?
>(*) packages/utils - shared utilities with a Rollup build
 (*) packages/ui - shared UI components
 (*) apps/web - web application
 ...

Project created successfully.
Layout: Monorepo
Package name: my-project
Workspace scope: @my-project
```

然后装依赖即可：

```bash
cd my-project
pnpm install
```

要求：**Node ≥ 20.12**，**pnpm**。

## 命令行参数

CI 和脚本里可以跳过提问，目录名可以写成位置参数，也可以写 `--name`：

```bash
create-fe-apps --yes                                     # 默认值：多体形态 + 全部子包
create-fe-apps my-app --kind single               # 单体形态，指定目录名
create-fe-apps my-app --subpackages utils,web   # 只生成这两类子包
```

| 参数                   | 说明                                                                            |
| ---------------------- | ------------------------------------------------------------------------------- |
| `--name <目录名>`      | 项目目录名                                                                      |
| `--kind <layout>`      | `single` 或 `monorepo`                                                          |
| `--subpackages <列表>` | 多体形态要生成的子包，逗号分隔；短名（`utils`）和路径（`packages/utils`）都接受 |
| `-y`、`--yes`          | 没显式给出的项一律取默认值                                                      |
| `-h`、`--help`         | 打印用法                                                                        |

目录名只能是小写字母、数字和连字符，且以字母或数字开头。目标目录已存在时**直接报错退出**，不会覆盖你已有的文件。

## 生成什么

**多体（Monorepo）**

```text
my-project/
├── apps/                   web / server / mobile
├── packages/               utils（自带 Rollup 打包） / ui
├── pnpm-workspace.yaml
├── eslint.config.mjs
├── prettier.config.mjs
├── stylelint.config.cjs
├── tsconfig.json
└── package.json
```

**单体（单包）**

```text
my-single-package/
├── src/index.ts
├── eslint.config.mjs
├── prettier.config.mjs
├── stylelint.config.cjs
├── tsconfig.json
└── package.json
```

两种形态共用同一套工程化配置，差别只在目录结构和 `package.json`：多体形态额外有 workspace、子包和按环境划分的 tsconfig / ESLint 作用域。

## 生成后的常用命令

```bash
pnpm install            # 顺带装好 husky 钩子
pnpm run lint           # ESLint + Prettier 检查
pnpm run typecheck
pnpm run format
pnpm run build          # 多体形态：递归构建 packages/*
```

> pnpm 必须写 `pnpm run <script>`，省略 `run` 会被当成安装一个同名包。

## 写在生成项目里的约定

这几条是使用这套骨架时真正需要遵守的，其他都可以自由发挥。

**1. 内部依赖用 `workspace:*`，写进 `dependencies`**

不要用相对路径跨包引用，也不要把内部依赖写进 `devDependencies` —— 后者会让它被静默内联进产物。

**2. 共享包「开发期用源码，发布时切产物」**

```jsonc
{
  "main": "src/index.ts", // 本地：消费方直接编译源码，不用先构建
  "publishConfig": {
    // 发布：pnpm pack 时换成产物入口
    "main": "dist/cjs/index.cjs",
    "exports": { ".": { "types": "…", "import": "…", "require": "…" } },
  },
}
```

所以**共享包发布必须用 `pnpm publish`**：`publishConfig` 的字段覆盖是 pnpm / yarn 的扩展，npm 不支持。`prepack` 会自动先构建。

**3. 库引用库时，依赖要被外部化**

`packages/*` 的 Rollup 配置从自身 `dependencies` / `peerDependencies` 派生 `external`，按第 1 条写依赖就不会把兄弟包内联进产物。

**4. 环境边界是划分好的**

浏览器包用 `lib: ["ESNext", "DOM"]` + `types: []`（写 `process` 会直接报类型错），Node 包用 `lib: ["ESNext"]` + `types: ["node"]`。跨环境引用时，把被引用包改回产物优先。

**5. 必须单实例的依赖放 `peerDependencies`**

react、antd 这类有全局状态的依赖交给应用安装。版本对不上时会**报错**，而不是悄悄装出第二份。

## 常见问题

**可以用 npm 或 yarn 吗？**
多体形态不建议：`pnpm-workspace.yaml` 和 `workspace:*` 都是 pnpm 专有语法。单体形态本身没有 workspace，但 Husky 钩子里写的是 `pnpm exec lint-staged`，换包管理器要一并改掉。

**生成的 app 是空壳吗？**
是。这里只提供工程化骨架，不含 React / Vue / Next 等框架，`src/index.ts` 是给你替换的占位文件。

**`pnpm lint` 报错说找不到某个包？**
改成 `pnpm run lint`。原因见上面的提示。

## 本仓库开发

```bash
pnpm install
pnpm run typecheck          # tsc --noEmit
pnpm run lint               # eslint + prettier --check
pnpm run build              # clean + typecheck + tsup
pnpm run audit:deps         # 校验模板里各包的依赖声明
pnpm run verify:templates   # 生成两种形态并跑它们的检查（较慢）
```

发布分两步：

```bash
pnpm run release       # standard-version：升版本 + CHANGELOG + tag，并把提交与 tag 推到 origin
pnpm run publish:npm   # pnpm publish，prepack 会先构建
```

## License

[MIT](./LICENSE)
