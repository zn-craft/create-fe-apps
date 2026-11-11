# typescript-best-practices 的项目决策

每条「决策 — 理由」，供技能下次直接沿用。

- 接口命名 — 全部加 `I` 前缀（`ICreateProjectOptions`、`IPackageInfo`）。技能默认如此，仓库原先的不带前缀只是历史写法、不是刻意约定，2026-11 统一成技能写法。
- 类型文件 — 沿用项目已有的 config/type 拆分：类型进 `src/main/main.type.ts` 与 `scripts/<脚本>/<脚本>.type.ts`，常量、值表和纯函数留在同名的 `.config.ts`，不把值表搬进 type 文件。
- 相对导入 — 一律不带后缀（`moduleResolution: Node`），`src/` 与 `scripts/` 保持一致。全仓库按 CommonJS 语义检查，脚本取自身位置用 `__dirname`，不写 `import.meta`。
