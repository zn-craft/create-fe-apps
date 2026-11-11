# AGENTS.md

本仓库的 AI 协作约定。目录内更近的 `AGENTS.md` 优先。

## 项目

`create-fe-apps` 是生成前端项目骨架的 CLI，支持**单体**（单包工程）与**多体**（`apps/*` + `packages/*` 的 Monorepo）两种形态。TypeScript（`strict`）+ tsup（CJS）+ pnpm + ESLint 9 flat config + Prettier + Husky/lint-staged，发版用 standard-version。Node `>= 20.12.0`，运行时依赖仅 `fs-extra`、`inquirer`。

## 命令

```bash
pnpm install
pnpm run typecheck   # tsc --noEmit，src/ 与 scripts/ 两份配置各跑一遍
pnpm run lint        # eslint + prettier --check，CI 同款
pnpm run build       # clean + typecheck + tsup
pnpm run audit:deps  # 校验 templates/ 里各包的依赖声明与实际用法是否对得上
pnpm run verify:templates  # 生成两种形态的项目并跑模板自带检查（慢，改模板后必跑）
```

提交前 `pnpm run typecheck` 与 `pnpm run lint` 需通过。

## 结构

```text
src/index.ts            # CLI 入口：参数解析、输出与错误兜底
src/main/index.ts       # main 模块出口：主流程函数、形态谓词与对外类型
src/main/main.ts        # 主流程：交互、拷贝模板、改写包名
src/main/main.config.ts # 常量与工具函数
src/main/main.type.ts   # 类型定义
templates/base/         # 两种形态共用的模板（husky / prettier / stylelint / ignore 文件）
templates/monorepo/     # 多体形态模板：workspace、apps/*、packages/*、根 tsconfig
templates/single/       # 单体形态模板：单包 package.json / tsconfig / src
scripts/auditDeps/      # 模板依赖审计（TS）：auditDeps.ts 流程 / .config.ts 常量与纯函数 / .type.ts 类型
scripts/verifyTemplates/ # 模板验证（TS）：同样的三件套
scripts/shared/         # 两个脚本共用的收窄工具
.agents/skills/         # 本仓库采用的编码技能，见「编码」
skill-memory/           # 技能要求拍板的项目决策
.github/workflows/      # CI：本仓库检查 + 模板验证
eslint.config.mjs      # 本仓库配置：ESLint / Prettier / TS / tsup
prettier.config.mjs
tsconfig.json          # 全仓库唯一的类型检查配置：src/ + scripts/ + tsup.config.ts
tsup.config.ts
CHANGELOG.md
LICENSE
README.md               # 中文主文档，README.en.md 为英文版
```

业务逻辑只写 `src/`。`scripts/` 与 `tsup.config.ts` 是本仓库自用的工具，但**和 `src/` 共用根目录唯一那份 `tsconfig.json`**，`include` 就是这三块，ESLint 的类型感知规则也覆盖这三块。别再加第二份配置：编辑器和 TS 语言服务按「离文件最近的 `tsconfig.json`」认领文件，多一份配置会让 `tsc -p` 与编辑器各走一套，漏掉的那一边就会按默认设置（ES5 + CommonJS）报一堆假错误。

`scripts/` 不随包发布，也不进 `dist/`：源码用 TS（同样受 `strict` 约束），由 `tsx`（devDependency）直接运行 `.ts`，不需要预先编译，所以根配置用 `noEmit`，不需要 `rootDir` / `outDir`。

全仓库按 CommonJS 语义检查（tsup 出 CJS，脚本也由 tsx 按 `"type": "commonjs"` 转成 CJS）：不写 `import.meta`，取脚本自身位置用 `__dirname`；相对导入不带后缀，和 `src/` 保持一致。

依赖方向单向：`index.ts` → `main/index.ts` → `main/main.ts` → `main/main.config.ts` → `main/main.type.ts`。

## 编码

风格以 `.agents/skills/` 下的三个技能为准：`typescript-best-practices`（类型建模、命名、边界收窄）、`js-best-practices`（语言层写法）、`code-comments`（注释该写什么）。技能里要求用户拍板的事项，结论记在 `skill-memory/` 对应文件里，不再重复问。

- 注释用中文，说明意图，不复述代码逻辑。
- 接口加 `I` 前缀（`ICreateProjectOptions`），枚举加 `E`；类型别名、联合类型不加前缀。
- 本模块的类型放 `xxx.type.ts`，值表与纯函数放 `xxx.config.ts`，带实现的流程放同名的实现文件。
- 外部数据（用户输入、读入的 JSON）先用类型守卫收窄，`any` 不进入后续逻辑。
- 类型用 `import type` 导入；禁止悬空 Promise；`console` 仅限 `src/index.ts`，主流程用 `ProgressReporter` 回调把进度交给入口输出。
- 函数默认写成箭头函数；只有依赖声明提升时才用 `function`。
- 格式交给 Prettier（分号、单引号、尾随逗号、80 列），换行符 LF，见 `.gitattributes`。

## templates/

模板内容会原样复制进用户项目，改动风险高于 `src/`。

- `templates/**` 被 ESLint、Prettier 忽略，没有自动检查兜底。
- 生成时先铺 `templates/base/`，再叠加 `templates/<形态>/` 的根级内容，同名文件后者覆盖前者；多体形态下 `apps/`、`packages/` 由子包勾选逐个拷贝。
- 模板里每个包的 `devDependencies` 必须覆盖它实际用到的 CLI 与类型包（例如 `typecheck` 脚本要有 `typescript`），用 `pnpm run audit:deps` 把关。本地能跑不代表声明齐全（包管理器会向上层 node_modules 兜底找），换到 `pnpm deploy` 或单包安装就会断，所以要单独查。
- 子包名由 CLI 改写为 `@<项目名>/<子包名>`；相关逻辑在 `src/main/main.ts` 的 `updateSubpackages`。
- 模板中的 tsconfig、ESLint/Prettier/Stylelint 配置必须能被对应工具直接解析。
- 根 tsconfig 的 `include` 须写具体源码路径，`"files": []` 与 `"include": []` 分别触发 TS18002、TS18003。

## 设计取舍

容易被后人改错的地方，记录当时的理由。

- **CLI 编译成 CommonJS**：`"type": "commonjs"`，tsup 只出 CJS。入口不需要 ESM 的树摇，CJS 在各种 Node 版本下启动最稳。
- **生成的项目里 ESLint 用 `.mjs`、Stylelint 用 `.cjs`**：各自匹配工具的实际加载能力。Stylelint 配置写的是 `module.exports`，在 `"type": "module"` 项目里必须是 `.cjs`。
- **模板带 `.gitattributes`**：强制 `eol=lf`。否则 `core.autocrlf=true` 的 Windows 机器会检出 CRLF，而 Prettier 的 `endOfLine: lf` 会让 `format:check` 必然失败。
- **用 `fs.mkdir` 而不是 `fs.ensureDir`**：`ensureDir` 对已存在的目录静默通过，与交互层的校验形成两套逻辑且存在竞态；`mkdir` 靠 `EEXIST` 报错，校验和创建收敛成一条路径。
- **共享包源码优先 + `publishConfig`**：工作区包是符号链接，开发期指源码可以省掉构建顺序（不会因为忘了 build 而报 TS2307），发布时覆盖成 `dist`。代价是消费方会用自己 tsconfig 检查依赖源码，所以跨环境引用的包要改回产物优先。
- **开发脚本用 TS + tsx**：`scripts/` 只服务于本仓库，转成 TS 后能和 `src/` 共享类型检查，少一类「脚本里的拼写错误要跑起来才发现」。运行交给 `tsx`，不新增编译产物，也不需要使用者多装东西；`tsx` 是 devDependency，`npm i -g create-fe-apps` 的使用者拿不到它。

## 提交与发版

- 提交信息用 Conventional Commits：`feat:` / `fix:` / `chore:` / `docs:` / `refactor:` / `test:`。
- `CHANGELOG.md` 与 `package.json` 的 `version` 由 `pnpm run release`（standard-version）生成，不手改；这一步同时负责打 tag 与推送。
- 发布单独执行 `pnpm run publish:npm`，它走 `pnpm publish`；当前 npm 的 2FA / 暂存发布策略下 `npm publish` 会失败或把版本送进待审区。
- `dist/`、`node_modules/`、`.husky/_/` 不入库。

## 文档

- 面向用户的说明写 `README.md`，并同步 `README.en.md`。
- Markdown 同样经过 Prettier，`format:check` 含 `.md`。

## 约束

- 包管理器固定 pnpm，不改 `packageManager`。
- 打包固定 tsup + CJS，不更换构建工具或输出格式。
- 不放宽 `strict`，不用 `@ts-ignore` 绕过类型错误。

## 验证

改 `src/`：`typecheck` → `lint` → `build` → 在临时目录执行 `node dist/index.js`，核对目录结构与子包名改写结果。

改 `templates/`：跑 `pnpm run audit:deps` 与 `pnpm run verify:templates`。后者会按几种组合生成项目、装依赖，并执行模板自带的 lint / typecheck / format / build；排查时加 `-- --keep` 保留临时目录。

完成后报告改动文件、原因、已执行的验证，以及未覆盖的部分。
