# create-fe-apps

**English** | [简体中文](./README.md)

Scaffold a fully-configured project in one command — pick a **single package** or a **Monorepo** (`apps/*` + `packages/*`). Both come with ESLint 9 flat config, Prettier, Stylelint, strict TypeScript, Husky and lint-staged.

```bash
npm create fe-apps
```

---

## Quick start

Run `npm create fe-apps` (or `npx create-fe-apps`) where the project should live and press Enter on everything — that gives you the full Monorepo:

```
? Please enter the project folder name: (my-monorepo-project)
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
Package name: my-monorepo-project
Workspace scope: @my-monorepo-project
```

Then install and go:

```bash
cd my-monorepo-project
pnpm install
```

Requirements: **Node ≥ 20.12** and **pnpm**.

## Command line options

CI and scripts can skip the prompts. The folder name can be a positional argument or `--name`:

```bash
create-fe-apps --yes                                     # defaults: Monorepo with every sub-package
create-fe-apps my-app --kind single               # single package with a chosen folder name
create-fe-apps my-app --subpackages utils,web   # only these two sub-packages
```

| Option                 | Description                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `--name <folder>`      | Project folder name                                                                                                 |
| `--kind <layout>`      | `single` or `monorepo`                                                                                              |
| `--subpackages <list>` | Sub-packages for the Monorepo layout, comma separated; short names (`utils`) and paths (`packages/utils`) both work |
| `-y`, `--yes`          | Use defaults for anything not given explicitly                                                                      |
| `-h`, `--help`         | Print the usage text                                                                                                |

Folder names may only contain lowercase letters, digits and hyphens, and must start with a letter or digit. If the target folder exists, the CLI **fails immediately** rather than writing into it.

## What you get

**Monorepo**

```text
my-monorepo-project/
├── apps/                   web / server / mobile
├── packages/               utils (Rollup build included) / ui
├── pnpm-workspace.yaml
├── eslint.config.mjs
├── prettier.config.mjs
├── stylelint.config.cjs
├── tsconfig.json
└── package.json
```

**Single package**

```text
my-single-package/
├── src/index.ts
├── eslint.config.mjs
├── prettier.config.mjs
├── stylelint.config.cjs
├── tsconfig.json
└── package.json
```

Both layouts share the same engineering config and differ only in directory layout and `package.json`: the Monorepo adds a workspace, sub-packages, and per-runtime tsconfig / ESLint scopes.

## Commands in the generated project

```bash
pnpm install            # also installs the Husky hooks
pnpm run lint           # ESLint + Prettier checks
pnpm run typecheck
pnpm run format
pnpm run build          # Monorepo only: recursively builds packages/*
```

> With pnpm you must write `pnpm run <script>`; without `run` it treats the name as a package to install.

## Conventions baked into the generated project

These are the only rules you really need to follow; everything else is yours to decide.

**1. Declare internal dependencies with `workspace:*`, inside `dependencies`**

Never reference another package by relative path, and never put an internal dependency in `devDependencies` — that gets it silently inlined into your output.

**2. Shared packages: source in development, build output when publishing**

```jsonc
{
  "main": "src/index.ts", // local: consumers compile the source, no build step needed
  "publishConfig": {
    // publish: pnpm pack swaps these for the artefacts
    "main": "dist/cjs/index.cjs",
    "exports": { ".": { "types": "…", "import": "…", "require": "…" } },
  },
}
```

Which means **publishing must go through `pnpm publish`**: overriding manifest fields via `publishConfig` is a pnpm / yarn extension that npm does not support. `prepack` builds first.

**3. A library importing a library keeps the dependency external**

The Rollup configs in `packages/*` derive `external` from their own `dependencies` / `peerDependencies`, so following rule 1 is enough to avoid inlining a sibling package.

**4. Runtime boundaries are already drawn**

Browser packages use `lib: ["ESNext", "DOM"]` with `types: []` (writing `process` fails at type-check time); Node packages use `lib: ["ESNext"]` with `types: ["node"]`. When one imports the other, switch the imported package back to build-output first.

**5. Keep singleton dependencies in `peerDependencies`**

Anything with global state (react, antd) should be installed by the application. A version mismatch then **fails loudly** instead of quietly producing a second copy.

## FAQ

**Can I use npm or yarn?**
Not with the Monorepo layout: `pnpm-workspace.yaml` and the `workspace:*` protocol are pnpm-specific. The single-package layout has no workspace, but `.husky/pre-commit` calls `pnpm exec lint-staged`, so that line has to change too.

**Is the generated app an empty shell?**
Yes. This only provides the engineering skeleton — no React / Vue / Next — and `src/index.ts` is a placeholder for you to replace.

**`pnpm lint` says a package cannot be found.**
Use `pnpm run lint`. See the note above.

## Working on this repository

```bash
pnpm install
pnpm run typecheck          # tsc --noEmit
pnpm run lint               # eslint + prettier --check
pnpm run build              # clean + typecheck + tsup
pnpm run audit:deps         # check that every template package declares what it uses
pnpm run verify:templates   # generate both layouts and run their checks (slow)
```

Releasing is two steps:

```bash
pnpm run release       # standard-version: bump, changelog, tag, then push commits and tags to origin
pnpm run publish:npm   # pnpm publish; prepack builds first
```

## License

[MIT](./LICENSE)
