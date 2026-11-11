# Monorepo

<!-- 换成项目名和一句话说明。 -->

## 开始

```bash
pnpm install
```

## 常用命令

| 命令                    | 作用                               |
| ----------------------- | ---------------------------------- |
| `pnpm run build`        | 递归构建所有共享包（`packages/*`） |
| `pnpm run lint`         | 全仓库 ESLint 检查                 |
| `pnpm run typecheck`    | 递归执行各子包的类型检查           |
| `pnpm run format`       | Prettier 格式化                    |
| `pnpm run format:check` | 只检查格式，不写入                 |

> pnpm 必须写 `pnpm run <script>`，省略 `run` 会被当成安装包名。

## 目录

- `apps/`：应用层，可独立部署
- `packages/`：共享包，被 apps 复用

## 依赖约定

- 包之间用 `workspace:*` 声明依赖，并且写进 `dependencies` 而不是 `devDependencies`。
- 应用引用共享包时直接编译源码，不需要先构建；只有发布共享包时才需要 `pnpm run build`。
- 共享包之间互相引用时，被引用方会被自动外部化，不会内联进产物。
- 发布共享包用 `pnpm publish`（`prepack` 会先执行构建）。
