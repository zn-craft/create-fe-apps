# crm-zn

[English](./README.en.md) | **简体中文**

快速生成配置齐全的项目骨架，支持两种形态：**单体**（单包工程）和**多体**（`apps/*` + `packages/*` 的 Monorepo）。两种形态都开箱自带 **ESLint、Prettier、Stylelint、TypeScript、Husky、lint-staged** 等工程化配置。

```bash
npx crm-zn
```

或者全局安装后使用：

```bash
pnpm add -g crm-zn
crm-zn
```

---

## 目录

- [它解决什么问题](#它解决什么问题)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [交互说明](#交互说明)
- [生成的项目结构](#生成的项目结构)
- [生成的项目自带什么](#生成的项目自带什么)
- [生成后的下一步](#生成后的下一步)
- [生成项目中的可用命令](#生成项目中的可用命令)
- [本仓库的开发](#本仓库的开发)
- [设计取舍](#设计取舍)
- [常见问题](#常见问题)
- [仓库结构](#仓库结构)
- [License](#license)

---

## 它解决什么问题

从零搭项目时，真正费时间的不是业务代码，而是这一堆东西：

- 该用哪种形态：一个包就够，还是要拆成 `apps/*` + `packages/*` 的 Monorepo；
- Monorepo 里 `pnpm-workspace.yaml` 怎么配，`apps/*` 和 `packages/*` 怎么划分；
- ESLint 9 的 **flat config** 怎么写（网上大量教程还是旧的 `.eslintrc`）；
- 根 `tsconfig.json` 和子项目 `tsconfig.json` 的继承关系怎么设计；
- Prettier 和 ESLint 的规则怎么不打架；
- Husky + lint-staged 怎么在提交前自动格式化；
- 各个子包的 `package.json` 名字、作用域、依赖引用怎么统一。

`crm-zn` 把上面这些一次性生成好，并且**所有配置都是可运行、经过校验的**，你只需要往里填业务代码。

两种形态共用同一套工程化配置，差别只在目录结构和 `package.json`：多体形态还会让你勾选具体要生成哪些子包。

生成的特点是：

| 特点                 | 说明                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| **作用域自动改写**   | 输入项目名 `my-app` 后，子包自动变成 `@my-app/utils`、`@my-app/web` 等                               |
| **配置全部经过验证** | 每个 `tsconfig.json` 都能被 `tsc` 直接加载，每个 ESLint/Prettier 配置都能被 ESLint/Prettier 直接解析 |
| **不覆盖已有目录**   | 目标目录已存在时直接报错退出，不会往你的现有目录里写文件                                             |
| **纯静态模板**       | 生成过程不需要联网，只依赖两个运行时包（`fs-extra`、`inquirer`）                                     |

---

## 环境要求

| 项目     | 要求                                                                            |
| -------- | ------------------------------------------------------------------------------- |
| Node.js  | **>= 20.12.0**                                                                  |
| 包管理器 | pnpm。两种形态的 Husky 钩子都用 `pnpm exec`，多体形态的 workspace 也只支持 pnpm |

> Node 版本下限来自运行时依赖 `inquirer@13`。低于该版本安装时会出现 `EBADENGINE` 警告，运行也可能失败。

---

## 快速开始

```bash
# 1. 在你想放项目的目录下执行
npx crm-zn
```

CLI 会依次问你项目名、项目形态，多体形态下再问要哪些子包。全部回车走默认值，得到的就是完整的 Monorepo：

```
Creating a project scaffold...

? Please enter the project folder name: (my-monorepo-project)
? Which project layout do you want? (Use arrow keys)
> Monorepo (apps + packages)
  Single package
? Which subpackages do you want?
>(*) packages/utils - shared utilities with a Rollup build
 (*) packages/ui - shared UI components
 (*) apps/web - web application
 (*) apps/server - server application
 (*) apps/mobile - mobile application

Creating project: my-monorepo-project
Copying shared config files...
Copying project template...
Copying subpackages...
Updating root package.json...
Updating workspace package names...

Project created successfully.
Layout: Monorepo
Package name: my-monorepo-project
Workspace scope: @my-monorepo-project
Subpackages: packages/utils, packages/ui, apps/web, apps/server, apps/mobile
```

选单体形态时不会问子包，结束信息也少两行：

```
Project created successfully.
Layout: Single package
Package name: my-single-package
```

最后进入目录安装依赖即可：

```bash
cd my-monorepo-project
pnpm install
```

---

## 交互说明

一共三个提问，只有第一个需要输入。

**1. 项目目录名**

| 输入                           | 结果                                |
| ------------------------------ | ----------------------------------- |
| 留空后回车                     | 使用默认值 `my-monorepo-project`    |
| `MyApp`                        | 自动转为小写 `myapp` 后通过校验     |
| `my-app-2`                     | ✅ 通过                             |
| `my app`                       | ❌ 只能包含小写字母、数字和连字符   |
| `_app` / `-app`                | ❌ 必须以字母或数字开头             |
| `web`（当前目录已存在 `web/`） | ❌ 提示该目录已存在，要求换一个名字 |

**2. 项目形态**

| 选项                         | 生成内容                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `Monorepo (apps + packages)` | `pnpm-workspace.yaml`、根 `package.json`（`typecheck` 走 `pnpm -r`）、勾选的子包（默认项） |
| `Single package`             | 单份 `package.json` 和 `tsconfig.json` 加 `src/index.ts`，没有 workspace                   |

**3. 子包（只在多体形态出现）**

默认全选。↑↓ 移动、空格切换、`a` 全选、`i` 反选，回车提交；一个都不选会被拦住。

| 子包             | 内容                         |
| ---------------- | ---------------------------- |
| `packages/utils` | 工具库，自带 Rollup 打包配置 |
| `packages/ui`    | 组件库                       |
| `apps/web`       | 浏览器端应用                 |
| `apps/server`    | 服务端应用                   |
| `apps/mobile`    | 移动端应用                   |

> 目录名的合法性在**两处**把关：交互时即时提示，创建时再用 `mkdir` 独占创建兜底。所以即使绕过交互，也不会覆盖已有目录。

---

## 生成的项目结构

### 多体（Monorepo）

下面以全选子包为例，实际只生成你勾选的那几个：

```text
my-monorepo-project/
├── apps/                        # 应用层（可独立部署）
│   ├── web/                     #   浏览器端
│   │   ├── src/index.ts
│   │   ├── package.json         #   → @my-monorepo-project/web
│   │   └── tsconfig.json
│   ├── server/                  #   服务端
│   └── mobile/                  #   移动端
├── packages/                    # 共享包层（被 apps 复用）
│   ├── ui/                      #   组件库
│   │   ├── src/index.ts
│   │   ├── package.json         #   → @my-monorepo-project/ui
│   │   └── tsconfig.json
│   └── utils/                   #   工具库（自带 Rollup 打包配置）
│       ├── src/index.ts
│       ├── rollup.config.js     #   同时产出 ESM / CJS / .d.ts
│       ├── package.json         #   → @my-monorepo-project/utils
│       └── tsconfig.json
├── .husky/pre-commit            # 提交前跑 lint-staged
├── .gitattributes               # 统一 LF 换行，避免跨平台 diff 噪音
├── .gitignore
├── .prettierignore
├── eslint.config.mjs            # ESLint 9 flat config
├── prettier.config.mjs
├── stylelint.config.cjs
├── pnpm-workspace.yaml          # packages/* + apps/*
├── tsconfig.json                # 各子项目 extends 的公共编译选项
└── package.json
```

每个子项目都有一份**自己的** `tsconfig.json`，通过 `extends: "../../tsconfig.json"` 继承公共选项，再按需覆盖 `lib` / `types`：

| 子项目                                   | 额外覆盖                 |
| ---------------------------------------- | ------------------------ |
| `apps/web`、`apps/mobile`、`packages/ui` | `lib: ["ESNext", "DOM"]` |
| `apps/server`、`packages/utils`          | `lib: ["ESNext"]`        |

### 单体（单包）

```text
my-single-package/
├── src/index.ts                 # 应用入口，目前是占位导出
├── .husky/pre-commit            # 提交前跑 lint-staged
├── .gitattributes
├── .gitignore
├── .prettierignore
├── eslint.config.mjs            # ESLint 9 flat config
├── prettier.config.mjs
├── stylelint.config.cjs
├── tsconfig.json                # 直接 include src
└── package.json
```

单体形态没有 `pnpm-workspace.yaml`，没有子包，`tsconfig.json` 也不需要在 `extends` 里接一根公共基座。

---

## 生成的项目自带什么

### ESLint 9（flat config）

生成的是 `eslint.config.mjs`，使用 ESLint 9 的 flat config 写法，按目录区分运行环境：

| 作用范围                                          | 全局变量环境                   |
| ------------------------------------------------- | ------------------------------ |
| `apps/web/**`、`apps/mobile/**`、`packages/ui/**` | 浏览器（`globals.browser`）    |
| `apps/server/**`、`packages/utils/**`             | Node（`globals.node`）         |
| `**/*.cjs`                                        | Node（`globals.node`）         |
| 其他文件                                          | 模块语义 + TypeScript 推荐规则 |

同时通过 `eslint-config-prettier` 关掉所有与 Prettier 冲突的格式化规则，用 `eslint-plugin-prettier` 把 Prettier 的问题作为 lint 警告暴露出来。

单体形态没有 `apps/*`、`packages/*` 的划分，只保留一份通用规则，默认按 Node 环境注入全局变量。要改成浏览器环境，把 `eslint.config.mjs` 里的 `globals` 和 `tsconfig.json` 里的 `lib` / `types` 一起换掉即可。

### Prettier

`printWidth: 120`、双引号、JSX 用单引号、不保留尾随逗号。`.prettierignore` 已排除 `node_modules`、`**/dist`、`pnpm-lock.yaml` 等。

### Stylelint

`stylelint-config-standard`，并关掉了 `selector-class-pattern` 和 `no-descending-specificity` 两条对组件库/工具类写法过于严格的规则。

### TypeScript

公共 `tsconfig.json` 开启的严格项包括：

- `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`；
- `moduleDetection: "force"`、`isolatedModules`、`verbatimModuleSyntax: false`；
- `moduleResolution: "bundler"`、`jsx: "react-jsx"`；
- `declaration` + `declarationMap`，方便共享包发布类型声明。

### Husky + lint-staged

`prepare` 脚本会在 `pnpm install` 时自动装好 Git 钩子，`pre-commit` 执行 `pnpm exec lint-staged`：

| 文件类型            | 执行动作                               |
| ------------------- | -------------------------------------- |
| `*.{js,ts,tsx,jsx}` | `eslint --fix` + `prettier --write`    |
| `*.{css,less,scss}` | `stylelint --fix` + `prettier --write` |
| `*.{json,md,html}`  | `prettier --write`                     |

### 共享包打包

`packages/utils` 用 Rollup 同时产出三种产物，`exports` 字段也已对应配好：

| 产物     | 路径                    |
| -------- | ----------------------- |
| ESM      | `dist/esm/index.js`     |
| CommonJS | `dist/cjs/index.cjs`    |
| 类型声明 | `dist/types/index.d.ts` |

---

## 生成后的下一步

生成的是**骨架**，`src/index.ts` 里目前是占位导出 `export {};`。建议按这个顺序开始：

1. **安装依赖**

   ```bash
   pnpm install
   ```

2. **确认骨架可用**

   ```bash
   pnpm run typecheck   # 应全部通过
   pnpm run lint        # 应全部通过
   ```

3. **改掉占位信息**：根 `package.json` 的 `description`、`author`、`license` 目前都是模板值。

4. **初始化 Git 仓库**（CLI 不会自动执行）：

   ```bash
   git init && git add -A && git commit -m "chore: init"
   ```

5. **按需增删子项目**：不需要 `apps/mobile` 就直接删掉该目录即可。根 `typecheck` 走的是 `pnpm -r run typecheck`，会按实际存在的子包自动收敛。

6. **开始写业务**：把共享代码放 `packages/`，应用入口放 `apps/`，子包之间用 `workspace:*` 互相引用：

   ```jsonc
   // apps/web/package.json
   {
     "dependencies": {
       "@my-monorepo-project/utils": "workspace:*",
       "@my-monorepo-project/ui": "workspace:*",
     },
   }
   ```

---

## 生成项目中的可用命令

在项目根目录执行（**注意加 `run`**，见下方说明）：

| 命令                    | 作用                                         |
| ----------------------- | -------------------------------------------- |
| `pnpm run lint`         | 全仓库 ESLint 检查                           |
| `pnpm run lint:fix`     | ESLint 自动修复                              |
| `pnpm run typecheck`    | 递归执行所有子包各自的 `typecheck`           |
| `pnpm run format`       | Prettier 格式化全部文件                      |
| `pnpm run format:check` | 只检查格式，不写入                           |
| `pnpm run prepare`      | 安装 Husky 钩子（`pnpm install` 会自动触发） |

单个子项目内还可以：

```bash
cd packages/utils
pnpm run build       # Rollup 打包，产出 esm + cjs + d.ts
pnpm run dev         # Rollup 监听模式
pnpm run typecheck   # 只检查这一个包
```

根目录也可以借助 pnpm 的递归能力批量执行：

```bash
pnpm -r run typecheck
pnpm --filter @my-monorepo-project/utils run build
```

> ⚠️ **pnpm 必须写 `pnpm run <script>`**
>
> 从 pnpm 7 起，`pnpm <script>` 这种省略 `run` 的旧写法已被移除。写 `pnpm lint` 时 pnpm 会把它当成「安装一个名为 lint 的包」，进而报出让人摸不着头脑的安装错误。Husky 钩子里也遵循同样规则，用的是 `pnpm exec lint-staged`。

---

## 本仓库的开发

```bash
# 安装依赖
pnpm install

# 类型检查（不产出文件）
pnpm run typecheck

# 代码检查 + 格式检查（CI 用的就是这两条）
pnpm run lint:eslint
pnpm run format:check

# 一键跑上面两条
pnpm run lint

# 构建：先清 dist，再类型检查，最后 tsup 打包
pnpm run build

# 监听模式
pnpm run dev
```

### 发布

```bash
pnpm run build
npm pack --dry-run    # 确认 dist/ 与 templates/ 都在 tarball 里
pnpm run release      # standard-version 升版本 + npm publish
```

`prepack` / `prepublishOnly` 都会自动先执行构建，避免出现「bin 指向的 `dist/index.js` 没被打进包」的情况。

### 技术选型

| 环节 | 选择             | 原因                                                                 |
| ---- | ---------------- | -------------------------------------------------------------------- |
| 语言 | TypeScript       | 严格模式 + 类型守卫，保证外部数据（用户输入、JSON 文件）先收窄再使用 |
| 打包 | tsup（esbuild）  | 零配置产出 CJS，自动加 shebang                                       |
| 测试 | 暂无             | 见下方「后续计划」                                                   |
| 发版 | standard-version | 按 Conventional Commits 自动生成 CHANGELOG                           |

---

## 设计取舍

这些地方容易被后人改错，特意记录当时的理由。

**为什么 CLI 编译成 CommonJS？**
`package.json` 里 `"type": "commonjs"`，`tsup` 也只产出 `format: ['cjs']`。CLI 入口不需要 ESM 的树摇能力，CJS 在各种 Node 版本下启动行为最稳定。

**为什么生成的项目里 ESLint 用 `eslint.config.mjs`，Stylelint 用 `stylelint.config.cjs`？**
两者要匹配各自实际的加载能力。ESLint 9 的 flat config 在 `"type": "module"` 的项目里用 `.mjs`；而 Stylelint 配置写的是 `module.exports`，必须用 `.cjs` 才能在 ESM 项目里被当成 CommonJS 解析。

**为什么模板分成 `base/` 和形态目录？**
两种形态共用同一套工程化配置，差别集中在目录结构和 `package.json` 上。共用部分放 `templates/base/`，形态专有的放 `templates/monorepo/` 和 `templates/single/`；拷贝时先铺 base 再叠加形态目录，同名文件后者覆盖前者。这样加新形态只需要多一个目录加一条配置，公共规则永远只有一份。

**为什么根 `tsconfig.json` 的 `include` 是 `["packages/*/src", "apps/*/src"]`？**
这是给子项目 `extends` 的公共基座。子项目自己的 `include: ["src"]` 会完全覆盖它。这里**不能写 `"files": []`** —— 那样虽然也能被继承，但直接运行 `tsc -p tsconfig.json` 会报 `TS18002: The 'files' list ... is empty`；也不建议写 `"include": []`（报 `TS18003`）。写成具体的源码路径，既能直接运行，又不会把根目录的配置文件卷进类型检查。

**为什么仓库要放 `.gitattributes`？**
强制 `eol=lf`。否则 `core.autocrlf=true` 的 Windows 机器会检出 CRLF，而 Prettier 默认按 LF 比对，`format:check` 在 Windows 上必然失败——这是一个和代码风格无关、纯粹由换行符引发的假错误。

**为什么不用 `fs.ensureDir` 创建目标目录？**
`ensureDir` 对已存在的目录会静默通过，和交互阶段的「目录已存在」校验形成两套逻辑，存在竞态窗口。改用 `fs.mkdir` 独占创建，靠 `EEXIST` 自然报错，把校验和创建收敛成一条路径。

---

## 常见问题

**Q：可以用 npm 或 yarn 吗？**
多体形态不建议。它是 pnpm workspace，`pnpm-workspace.yaml` 与 `workspace:*` 协议都是 pnpm 专有语法，换成 npm/yarn 需要把依赖引用全部改掉。单体形态本身没有 workspace，但 `.husky/pre-commit` 写的是 `pnpm exec lint-staged`，换包管理器时要一并改掉这一行。

**Q：支持哪几种项目形态？**
两种：单体（单包工程）和多体（Monorepo）。两者共用同一套 ESLint / Prettier / Stylelint / Husky 配置，差别只在目录结构和 `package.json`；多体形态还会让你勾选具体生成哪些子包。

**Q：`pnpm lint` 报错说找不到某个包？**
请改用 `pnpm run lint`。原因见上文「生成项目中的可用命令」下的提示。

**Q：`pnpm run typecheck` 报 `Cannot find type definition file for 'node'`？**
先执行 `pnpm install`。该错误是因为 `@types/node` 还没装上。

**Q：提交时 Husky 没有触发？**
确认 `pnpm install` 成功执行过（它会触发 `prepare` → `husky`），并且仓库已经 `git init`。Husky 的钩子只对 Git 仓库生效。

**Q：生成的 `apps/web` 只是个空壳？**
是的。模板只提供**工程化骨架**，不含具体框架（React/Vue/Next 等）。请按需自行接入，`src/index.ts` 是给你替换的占位文件。

**Q：怎么删掉某个子项目？**
直接删目录即可。根 `typecheck` 是 `pnpm -r run typecheck`，`pnpm-workspace.yaml` 用的是 `packages/*` + `apps/*` 的 glob，两处都不需要跟着改。

---

## 仓库结构

```text
crm-zn/
├── src/
│   ├── index.ts            # CLI 入口：输出与错误兜底
│   ├── main/
│   │   ├── index.ts        # main 模块出口，只导出主流程函数
│   │   ├── main.ts         # 主流程：交互、拷贝模板、改写包名
│   │   ├── main.config.ts  # 常量与工具函数
│   │   └── main.type.ts    # 类型定义
├── templates/              # 生成项目时被拷贝的模板
│   ├── base/               #   两种形态共用：husky / prettier / stylelint / ignore 文件
│   ├── monorepo/           #   多体形态：workspace、apps/*、packages/*、根 tsconfig
│   └── single/             #   单体形态：单包 package.json / tsconfig / src
├── eslint.config.mjs       # 本仓库自己的 ESLint 配置
├── prettier.config.mjs
├── tsconfig.json
├── tsup.config.ts
└── package.json
```

CLI 的工作流程很短：

1. 交互式询问目录名并校验，再询问形态，多体形态下继续询问子包；
2. 用 `fs.mkdir` 在 `process.cwd()` 下**独占创建**目标目录；
3. 先铺 `templates/base/`，再叠加 `templates/<形态>/` 的根级内容，同名文件以后者为准（templates 目录的定位基准是构建产物 `dist/index.js` 的上一级）；
4. 多体形态下按勾选结果逐个拷贝 `apps/<子包>` 与 `packages/<子包>`；
5. 改写根 `package.json` 的 `name`；
6. 多体形态下遍历 `apps/` 和 `packages/`，把每个子包的名字改写成 `@<项目名>/<子包名>`，并同步改写其中的 `@template/*` 依赖引用。

---

## License

[MIT](./LICENSE)
