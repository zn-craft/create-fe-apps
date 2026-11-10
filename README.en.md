# crm-zn

**English** | [简体中文](./README.md)

Scaffold a fully-configured project in seconds — **ESLint, Prettier, Stylelint, TypeScript, Husky and lint-staged** included and ready to run. Two layouts are supported: a **single package** and a **Monorepo** (`apps/*` + `packages/*` on pnpm workspaces).

```bash
npx crm-zn
```

Or install it globally:

```bash
pnpm add -g crm-zn
crm-zn
```

---

## Contents

- [What problem does it solve](#what-problem-does-it-solve)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Interactive prompt](#interactive-prompt)
- [Generated project structure](#generated-project-structure)
- [What the generated project ships with](#what-the-generated-project-ships-with)
- [Next steps after generating](#next-steps-after-generating)
- [Commands in the generated project](#commands-in-the-generated-project)
- [Working on this repository](#working-on-this-repository)
- [Design decisions](#design-decisions)
- [FAQ](#faq)
- [Repository layout](#repository-layout)
- [License](#license)

---

## What problem does it solve

When you start a project from scratch, the time sink is never the business code — it is all of this:

- Which layout to use: one package is enough, or it has to be split into `apps/*` + `packages/*`.
- How to wire up `pnpm-workspace.yaml`, and how to split `apps/*` from `packages/*`.
- How to write an **ESLint 9 flat config** (most tutorials online still teach the legacy `.eslintrc` format).
- How the root `tsconfig.json` should relate to each sub-project's `tsconfig.json`.
- How to stop Prettier and ESLint from fighting over the same rules.
- How to make Husky + lint-staged format and lint on every commit.
- How to keep every sub-package's name, scope and cross-references consistent.

`crm-zn` generates all of the above in one shot, and **every generated config actually runs and has been verified**. You only need to add business code.

Both layouts share the same engineering config and differ only in directory layout and `package.json`. In the Monorepo layout you also pick which sub-packages to generate.

What makes it different:

| Feature                          | Description                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Automatic scope rewriting**    | Enter `my-app` and sub-packages become `@my-app/utils`, `@my-app/web`, and so on                       |
| **Every config is verified**     | Each `tsconfig.json` loads directly in `tsc`; each ESLint/Prettier config is parsed by ESLint/Prettier |
| **Never overwrites a directory** | If the target directory exists, the CLI fails immediately instead of writing into your files           |
| **Fully static templates**       | Generation needs no network access and only two runtime packages: `fs-extra` and `inquirer`            |

---

## Requirements

| Item            | Requirement                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Node.js         | **>= 20.12.0**                                                                                       |
| Package manager | pnpm. Both layouts call `pnpm exec` from the Husky hook, and the Monorepo layout is a pnpm workspace |

> The Node.js floor comes from the runtime dependency `inquirer@13`. On older versions you will see an `EBADENGINE` warning at install time and the CLI may fail at runtime.

---

## Quick start

```bash
# 1. Run it in the directory where the project should live
npx crm-zn
```

The CLI asks for a project name, then a layout, then — for the Monorepo layout — which sub-packages you want. Pressing Enter on everything gives you the full Monorepo:

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

The single-package layout skips the sub-package question and prints a shorter summary:

```
Project created successfully.
Layout: Single package
Package name: my-single-package
```

Then enter the directory and install dependencies:

```bash
cd my-monorepo-project
pnpm install
```

---

## Interactive prompt

There are three prompts in total; only the first one takes free text.

**1. Project directory name**

| Input                                   | Result                                                         |
| --------------------------------------- | -------------------------------------------------------------- |
| Empty, then Enter                       | Uses the default `my-monorepo-project`                         |
| `MyApp`                                 | Lowercased to `myapp`, then accepted                           |
| `my-app-2`                              | ✅ Accepted                                                    |
| `my app`                                | ❌ Only lowercase letters, digits and hyphens are allowed      |
| `_app` / `-app`                         | ❌ Must start with a letter or a digit                         |
| `web` (when `web/` already exists here) | ❌ Reports that the directory exists and asks for another name |

**2. Project layout**

| Option                       | What you get                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Monorepo (apps + packages)` | `pnpm-workspace.yaml`, a root `package.json` whose `typecheck` runs `pnpm -r`, plus the sub-packages you pick |
| `Single package`             | One `package.json`, one `tsconfig.json` and `src/index.ts`, with no workspace                                 |

**3. Sub-packages (Monorepo layout only)**

Everything is selected by default. Move with ↑↓, toggle with space, `a` selects all, `i` inverts, Enter submits. Submitting an empty selection is rejected.

| Sub-package      | Contents                            |
| ---------------- | ----------------------------------- |
| `packages/utils` | Utility library with a Rollup build |
| `packages/ui`    | Component library                   |
| `apps/web`       | Browser application                 |
| `apps/server`    | Server application                  |
| `apps/mobile`    | Mobile application                  |

> The directory name is checked in **two** places: interactively for immediate feedback, and again via an exclusive `mkdir` when creating. So even if the prompt is bypassed, an existing directory is never overwritten.

---

## Generated project structure

### Monorepo

The example below selects every sub-package; in practice only the ones you tick are generated.

```text
my-monorepo-project/
├── apps/                        # Applications (independently deployable)
│   ├── web/                     #   Browser client
│   │   ├── src/index.ts
│   │   ├── package.json         #   → @my-monorepo-project/web
│   │   └── tsconfig.json
│   ├── server/                  #   Server
│   └── mobile/                  #   Mobile client
├── packages/                    # Shared packages (reused by apps)
│   ├── ui/                      #   Component library
│   │   ├── src/index.ts
│   │   ├── package.json         #   → @my-monorepo-project/ui
│   │   └── tsconfig.json
│   └── utils/                   #   Utility library (Rollup build included)
│       ├── src/index.ts
│       ├── rollup.config.js     #   Emits ESM / CJS / .d.ts together
│       ├── package.json         #   → @my-monorepo-project/utils
│       └── tsconfig.json
├── .husky/pre-commit            # Runs lint-staged before each commit
├── .gitattributes               # Pins LF, avoids cross-platform diff noise
├── .gitignore
├── .prettierignore
├── eslint.config.mjs            # ESLint 9 flat config
├── prettier.config.mjs
├── stylelint.config.cjs
├── pnpm-workspace.yaml          # packages/* + apps/*
├── tsconfig.json                # Shared compiler options that sub-projects extend
└── package.json
```

Every sub-project has **its own** `tsconfig.json` that extends the shared root via `extends: "../../tsconfig.json"` and overrides `lib` / `types` as needed:

| Sub-project                              | Extra overrides          |
| ---------------------------------------- | ------------------------ |
| `apps/web`, `apps/mobile`, `packages/ui` | `lib: ["ESNext", "DOM"]` |
| `apps/server`, `packages/utils`          | `lib: ["ESNext"]`        |

### Single package

```text
my-single-package/
├── src/index.ts                 # Application entry point, currently a placeholder
├── .husky/pre-commit            # Runs lint-staged before each commit
├── .gitattributes
├── .gitignore
├── .prettierignore
├── eslint.config.mjs            # ESLint 9 flat config
├── prettier.config.mjs
├── stylelint.config.cjs
├── tsconfig.json                # Includes src directly
└── package.json
```

There is no `pnpm-workspace.yaml`, no sub-packages, and no shared base for `tsconfig.json` to `extends`.

---

## What the generated project ships with

### ESLint 9 (flat config)

The generated `eslint.config.mjs` uses ESLint 9's flat config and sets globals per directory:

| Scope                                             | Globals                                         |
| ------------------------------------------------- | ----------------------------------------------- |
| `apps/web/**`, `apps/mobile/**`, `packages/ui/**` | Browser (`globals.browser`)                     |
| `apps/server/**`, `packages/utils/**`             | Node (`globals.node`)                           |
| `**/*.cjs`                                        | Node (`globals.node`)                           |
| Everything else                                   | Module semantics + recommended TypeScript rules |

`eslint-config-prettier` disables every formatting rule that would conflict with Prettier, while `eslint-plugin-prettier` surfaces Prettier problems as lint warnings.

The single-package layout has no `apps/*` / `packages/*` split: it keeps one generic rule set and injects Node globals by default. To target the browser instead, swap `globals` in `eslint.config.mjs` together with `lib` and `types` in `tsconfig.json`.

### Prettier

`printWidth: 120`, double quotes, single quotes in JSX, no trailing commas. `.prettierignore` already excludes `node_modules`, `**/dist`, `pnpm-lock.yaml` and more.

### Stylelint

Built on `stylelint-config-standard`, with `selector-class-pattern` and `no-descending-specificity` disabled because those two are overly strict for component libraries and utility-class CSS.

### TypeScript

Strict options enabled in the shared `tsconfig.json`:

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`;
- `moduleDetection: "force"`, `isolatedModules`, `verbatimModuleSyntax: false`;
- `moduleResolution: "bundler"`, `jsx: "react-jsx"`;
- `declaration` + `declarationMap`, so shared packages publish type declarations.

### Husky + lint-staged

The `prepare` script installs the Git hooks during `pnpm install`, and `pre-commit` runs `pnpm exec lint-staged`:

| File type           | Action                                 |
| ------------------- | -------------------------------------- |
| `*.{js,ts,tsx,jsx}` | `eslint --fix` + `prettier --write`    |
| `*.{css,less,scss}` | `stylelint --fix` + `prettier --write` |
| `*.{json,md,html}`  | `prettier --write`                     |

### Shared package builds

`packages/utils` uses Rollup to emit three artefacts, with the `exports` field already wired up:

| Artefact          | Path                    |
| ----------------- | ----------------------- |
| ESM               | `dist/esm/index.js`     |
| CommonJS          | `dist/cjs/index.cjs`    |
| Type declarations | `dist/types/index.d.ts` |

---

## Next steps after generating

What you get is a **skeleton**: `src/index.ts` currently contains the placeholder `export {};`. A sensible order to start:

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Confirm the skeleton is healthy**

   ```bash
   pnpm run typecheck   # everything should pass
   pnpm run lint        # everything should pass
   ```

3. **Replace the placeholder metadata**: `description`, `author` and `license` in the root `package.json` are still template values.

4. **Initialise the Git repository** (the CLI does not do this):

   ```bash
   git init && git add -A && git commit -m "chore: init"
   ```

5. **Add or remove sub-projects as needed**: if you do not need `apps/mobile`, just delete the directory. The root `typecheck` runs `pnpm -r run typecheck`, so it narrows to whatever sub-packages actually exist.

6. **Start building**: put shared code in `packages/`, application entry points in `apps/`, and reference sub-packages with `workspace:*`:

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

## Commands in the generated project

Run these from the project root (**note the `run` keyword** — see the warning below):

| Command                 | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `pnpm run lint`         | ESLint across the whole repository                              |
| `pnpm run lint:fix`     | ESLint with automatic fixes                                     |
| `pnpm run typecheck`    | Run every sub-package's own `typecheck` recursively             |
| `pnpm run format`       | Format every file with Prettier                                 |
| `pnpm run format:check` | Check formatting only, without writing                          |
| `pnpm run prepare`      | Install Husky hooks (also runs automatically on `pnpm install`) |

Inside a single sub-project you can also run:

```bash
cd packages/utils
pnpm run build       # Rollup build: esm + cjs + d.ts
pnpm run dev         # Rollup in watch mode
pnpm run typecheck   # Type-check just this package
```

Thanks to pnpm's recursion you can also drive everything from the root:

```bash
pnpm -r run typecheck
pnpm --filter @my-monorepo-project/utils run build
```

> ⚠️ **With pnpm you must write `pnpm run <script>`**
>
> Since pnpm 7, the legacy shorthand `pnpm <script>` (without `run`) has been removed. Writing `pnpm lint` makes pnpm treat `lint` as a package to install, which produces a confusing installation error instead of running your script. The Husky hooks follow the same rule and therefore use `pnpm exec lint-staged`.

---

## Working on this repository

```bash
# Install dependencies
pnpm install

# Type-check only, no output
pnpm run typecheck

# Lint and check formatting (this is exactly what CI runs)
pnpm run lint:eslint
pnpm run format:check

# Run both of the above
pnpm run lint

# Build: clean dist, type-check, then bundle with tsup
pnpm run build

# Watch mode
pnpm run dev
```

### Releasing

```bash
pnpm run build
npm pack --dry-run    # verify dist/ and templates/ are inside the tarball
pnpm run release      # standard-version bumps the version, then npm publish
```

Both `prepack` and `prepublishOnly` run the build first, so the CLI's `bin` target (`dist/index.js`) can never be missing from the published package.

### Toolchain

| Concern  | Choice           | Reason                                                                                         |
| -------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| Language | TypeScript       | Strict mode plus type guards, so external data (user input, JSON files) is narrowed before use |
| Bundler  | tsup (esbuild)   | Zero-config CJS output with an automatic shebang                                               |
| Tests    | None yet         | See "Planned work" below                                                                       |
| Releases | standard-version | Generates CHANGELOG entries from Conventional Commits                                          |

---

## Design decisions

These are the spots where a future change is most likely to break something, so the reasoning is recorded here.

**Why is the CLI compiled to CommonJS?**
`package.json` sets `"type": "commonjs"` and `tsup` only emits `format: ['cjs']`. A CLI entry point gains nothing from ESM tree-shaking, and CommonJS has the most predictable startup behaviour across Node versions.

**Why does the generated project use `eslint.config.mjs` but `stylelint.config.cjs`?**
Each file has to match how its tool actually loads config. ESLint 9's flat config uses `.mjs` inside a `"type": "module"` project; the Stylelint config contains `module.exports`, so it must be `.cjs` to be parsed as CommonJS in an ESM project.

**Why is the template split into `base/` and per-layout directories?**
Both layouts share the same engineering config; the differences are the directory layout and `package.json`. Shared files live in `templates/base/`, layout-specific ones in `templates/monorepo/` and `templates/single/`. Generation lays down `base/` first and overlays the layout directory, so a file present in both is won by the overlay. Adding a layout then means one directory plus one config entry, and the shared rules only ever exist once.

**Why is the root `tsconfig.json` `include` set to `["packages/*/src", "apps/*/src"]`?**
That root file is the shared base for sub-projects to extend, and each sub-project's own `include: ["src"]` fully overrides it. Do **not** write `"files": []` here — it is inherited fine, but running `tsc -p tsconfig.json` directly then fails with `TS18002: The 'files' list ... is empty`. `"include": []` is also wrong (it raises `TS18003`). Listing the real source paths means the config runs cleanly on its own and never sweeps config files from the project root into type-checking.

**Why does the repository contain `.gitattributes`?**
To force `eol=lf`. Without it, a Windows machine with `core.autocrlf=true` checks files out as CRLF while Prettier compares against LF by default, so `format:check` is guaranteed to fail on Windows. That is a false error caused purely by line endings, with nothing to do with code style.

**Why not use `fs.ensureDir` to create the target directory?**
`ensureDir` silently succeeds on an existing directory, which duplicates the "directory already exists" check from the prompt and leaves a race window. Using `fs.mkdir` for exclusive creation lets `EEXIST` surface naturally, collapsing validation and creation into a single code path.

---

## FAQ

**Q: Can I use npm or yarn?**
Not with the Monorepo layout. It is a pnpm workspace; `pnpm-workspace.yaml` and the `workspace:*` protocol are pnpm-specific, and switching means rewriting every internal dependency reference. The single-package layout has no workspace, but `.husky/pre-commit` calls `pnpm exec lint-staged`, so that line has to change too.

**Q: Which layouts are supported?**
Two: single package and Monorepo. They share the same ESLint / Prettier / Stylelint / Husky config and differ only in directory layout and `package.json`; the Monorepo layout additionally asks which sub-packages to generate.

**Q: `pnpm lint` fails saying a package cannot be found.**
Use `pnpm run lint` instead. See the warning under "Commands in the generated project".

**Q: `pnpm run typecheck` reports `Cannot find type definition file for 'node'`.**
Run `pnpm install` first — that error simply means `@types/node` is not installed yet.

**Q: The Husky hook does not fire on commit.**
Make sure `pnpm install` completed successfully (it triggers `prepare` → `husky`) and that the project is a Git repository. Husky hooks only apply inside a Git repo.

**Q: Is `apps/web` just an empty shell?**
Yes. The template provides the **engineering skeleton** only, with no framework (React, Vue, Next, …). Add your own, and replace the placeholder `src/index.ts`.

**Q: How do I remove a sub-project?**
Just delete the directory. The root `typecheck` runs `pnpm -r run typecheck` and `pnpm-workspace.yaml` uses `packages/*` + `apps/*` globs, so neither needs editing.

---

## Repository layout

```text
crm-zn/
├── src/
│   ├── index.ts            # CLI entry: output and error handling
│   ├── main/
│   │   ├── index.ts        # main module barrel: exports the main flow only
│   │   ├── main.ts         # Main flow: prompt, copy template, rewrite names
│   │   ├── main.config.ts  # Constants and helper functions
│   │   └── main.type.ts    # Type definitions
├── templates/              # Copied when generating a project
│   ├── base/               #   Shared by both layouts: husky / prettier / stylelint / ignore files
│   ├── monorepo/           #   Monorepo layout: workspace, apps/*, packages/*, root tsconfig
│   └── single/             #   Single-package layout: package.json / tsconfig / src
├── eslint.config.mjs       # This repository's own ESLint config
├── prettier.config.mjs
├── tsconfig.json
├── tsup.config.ts
└── package.json
```

The CLI flow is short:

1. Ask for the directory name interactively and validate it, then ask for the layout (and, for the Monorepo layout, the sub-packages).
2. Create the target directory under `process.cwd()` with an **exclusive** `fs.mkdir`.
3. Lay down `templates/base/`, then overlay the root-level contents of `templates/<layout>/`; a file present in both is won by the overlay (the template directory is resolved relative to the built `dist/index.js`).
4. For the Monorepo layout, copy `apps/<sub-package>` and `packages/<sub-package>` for each selection.
5. Rewrite the root `package.json` `name`.
6. For the Monorepo layout, walk `apps/` and `packages/`, renaming each sub-package to `@<project>/<sub-package>` and rewriting any `@template/*` dependency references to match.

---

## License

[MIT](./LICENSE)
