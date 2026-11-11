import path from 'node:path';

import fs from 'fs-extra';

import type { JsonObject, ProjectKind, SubPackageChoice } from './main.type';

// ---------- 常量 ----------

/**
 * 找模板目录。
 * tsup 会把所有模块打包进 dist/index.js，此时 __dirname 是 dist；
 * 逐文件编译时本文件会落在 dist/main 下，再写死 ../templates 就指错了。
 * 两种布局的差别只在于向上几层，所以从当前文件往上找第一个含 templates 的目录。
 */
function locateTemplatesDir(): string {
  let dir = __dirname;

  for (let depth = 0; depth < 3; depth += 1) {
    const candidate = path.join(dir, 'templates');

    if (fs.existsSync(candidate)) {
      return candidate;
    }

    dir = path.dirname(dir);
  }

  // 兜底给出打包布局下的位置，让拷贝阶段自己报 ENOENT。
  return path.join(__dirname, '../templates');
}

/** 模板目录的绝对路径。 */
export const TEMPLATE_DIR = locateTemplatesDir();

/** 两种形态共用的模板目录，放的是 ESLint / Prettier / Stylelint / Husky 这套知识体系。 */
export const TEMPLATE_BASE_DIR = path.join(TEMPLATE_DIR, 'base');

/**
 * 各形态的模板目录与交互文案，键的顺序即交互里的展示顺序。
 * 用 Record 是为了让新增 ProjectKind 时这里必须补齐，否则类型检查会报错。
 */
export const PROJECT_KINDS: Record<
  ProjectKind,
  { label: string; dir: string }
> = {
  monorepo: { label: 'Monorepo (apps + packages)', dir: 'monorepo' },
  single: { label: 'Single package', dir: 'single' },
};

/** 形态的展示顺序，取自 PROJECT_KINDS 的键顺序。 */
const PROJECT_KIND_ORDER = Object.keys(PROJECT_KINDS) as ProjectKind[];

/** 会被重命名作用域的子包目录。 */
export const SUBPACKAGE_DIRS = ['apps', 'packages'] as const;

/** 默认形态：不选时保持工具原本只生成 Monorepo 的行为。 */
export const DEFAULT_PROJECT_KIND: ProjectKind = PROJECT_KIND_ORDER[0];

/** 交互里可选的项目形态。 */
export const PROJECT_KIND_CHOICES: readonly {
  value: ProjectKind;
  label: string;
}[] = PROJECT_KIND_ORDER.map((value) => ({
  value,
  label: PROJECT_KINDS[value].label,
}));

/**
 * 子包目录 → 交互里的说明，同时决定展示顺序。
 * 候选集来自模板目录本身，所以新增子包只要加目录就会出现在交互里。
 */
const SUBPACKAGE_LABELS: Record<string, string> = {
  'packages/utils': 'shared utilities with a Rollup build',
  'packages/ui': 'shared UI components',
  'apps/web': 'web application',
  'apps/server': 'server application',
  'apps/mobile': 'mobile application',
};

/** 列出多体模板里真实存在的子包目录。 */
function listSubPackageDirs(): string[] {
  const dirs: string[] = [];

  for (const topDir of SUBPACKAGE_DIRS) {
    const topPath = path.join(resolveTemplateDir('monorepo'), topDir);

    if (!fs.existsSync(topPath)) {
      continue;
    }

    for (const entry of fs.readdirSync(topPath, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        dirs.push(`${topDir}/${entry.name}`);
      }
    }
  }

  return dirs;
}

/** 取某个形态对应的模板目录。 */
export function resolveTemplateDir(kind: ProjectKind): string {
  return path.join(TEMPLATE_DIR, PROJECT_KINDS[kind].dir);
}

/** 多体模式可勾选的子包；顺序取自 SUBPACKAGE_LABELS，未登记的排在后面。 */
export function resolveMonorepoSubPackages(): SubPackageChoice[] {
  const available = new Set(listSubPackageDirs());
  const known = Object.keys(SUBPACKAGE_LABELS).filter((value) =>
    available.has(value),
  );
  const extra = [...available]
    .filter((value) => !(value in SUBPACKAGE_LABELS))
    .sort();

  return [...known, ...extra].map((value) => {
    const description = SUBPACKAGE_LABELS[value];

    return {
      value,
      label: description ? `${value} - ${description}` : value,
    };
  });
}

/** 子包名允许出现的字符。 */
export const PACKAGE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * 目录名校验文案。
 * 交互阶段的即时提示和主流程的兜底报错共用同一份，
 * 两处都从用户输入出发，措辞不该各写一套。
 */
export const FOLDER_NAME_REQUIRED_MESSAGE = 'Folder name is required.';

export const FOLDER_NAME_INVALID_MESSAGE =
  'Folder name can only contain lowercase letters, numbers, and hyphens, and must start with a letter or number.';

export const FOLDER_NAME_EXISTS_MESSAGE =
  'The folder already exists. Please choose another name.';

export const SUBPACKAGE_REQUIRED_MESSAGE = 'Select at least one subpackage.';

/** 目录名的默认值：交互里直接回车，或命令行加 --yes 时使用。 */
export const DEFAULT_FOLDER_NAME = 'my-monorepo-project';

// ---------- 工具函数 ----------

/** 把用户输入收敛成实际使用的目录名：去掉首尾空格并转小写。 */
export function normalizeFolderName(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * 只接受普通对象。
 * 读进来的 package.json 是外部数据，先收窄类型再往下传，
 * 避免把 any 一路带进后续逻辑。
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 读取并解析一个 package.json。
 * 文件不存在或不是合法对象时返回 undefined。
 */
export async function readJsonObject(
  filePath: string,
): Promise<JsonObject | undefined> {
  if (!(await fs.pathExists(filePath))) {
    return undefined;
  }

  let parsed: unknown;

  try {
    parsed = await fs.readJson(filePath);
  } catch {
    return undefined;
  }

  return isJsonObject(parsed) ? parsed : undefined;
}

/** 写回 package.json，缩进统一在工具函数里，免得各处手写格式。 */
export async function writeJsonObject(
  filePath: string,
  value: JsonObject,
): Promise<void> {
  await fs.writeJson(filePath, value, { spaces: 2 });
}

/** 校验目录名。交互阶段已经拦过一次，这里给主流程兜底。 */
export function assertValidFolderName(folderName: string): void {
  if (!folderName) {
    throw new Error(FOLDER_NAME_REQUIRED_MESSAGE);
  }

  if (!PACKAGE_NAME_PATTERN.test(folderName)) {
    throw new Error(FOLDER_NAME_INVALID_MESSAGE);
  }
}

/** 取子包里最可用的名称片段，作为新包名的末段。 */
export function resolveSubpackageBaseName(
  packageJson: JsonObject,
  dirName: string,
): string {
  const declaredName = packageJson.name;

  if (typeof declaredName !== 'string' || !declaredName.trim()) {
    return dirName;
  }

  const trimmed = declaredName.trim();

  // @scope/name -> name；裸名 -> 裸名。
  return trimmed.includes('/')
    ? (trimmed.split('/').pop() ?? dirName)
    : trimmed;
}
