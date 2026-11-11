# Project

<!-- 换成项目名和一句话说明。 -->

## 开始

```bash
pnpm install
```

## 常用命令

| 命令                    | 作用                |
| ----------------------- | ------------------- |
| `pnpm run lint`         | ESLint 检查         |
| `pnpm run typecheck`    | TypeScript 类型检查 |
| `pnpm run format`       | Prettier 格式化     |
| `pnpm run format:check` | 只检查格式，不写入  |

> pnpm 必须写 `pnpm run <script>`，省略 `run` 会被当成安装包名。

## 运行环境

默认按 Node 环境配置：`tsconfig.json` 里是 `types: ["node"]`，`eslint.config.mjs` 里注入 `globals.node`。

改成浏览器项目时要同时调整两处：

- `tsconfig.json`：`types` 清空，`lib` 换成 `["ESNext", "DOM"]`
- `eslint.config.mjs`：把 `globals.node` 换成 `globals.browser`
