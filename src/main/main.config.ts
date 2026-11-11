// main 模块的常量与工具函数；流程编排在 main.ts。
import path from 'node:path';

import fs from 'fs-extra';

import type {
  IProjectKindChoice,
  IProjectKindTemplate,
  ISubPackageChoice,
  JsonObject,
  ProjectKind,
} from './main.type';

// ---------- 常量 ----------

/**
 * 找模板目录。
 * tsup 会把所有模块打包进 dist/index.js，此时 __dirname 是 dist；
 * 逐文件编译时本文件会落在 dist/main 下，再写死 ../templates 就指错了。
 * 两种布局的差别只在于向上几层，所以从当前文件往上找第一个含 templates 的目录。
 */
const locateTemplatesDir = (): string => {
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
};

/** 模板目录的绝对路径。 */
export const TEMPLATE_DIR = locateTemplatesDir();

/** 两种形态共用的模板目录，放的是 ESLint / Prettier / Stylelint / Husky 这套知识体系。 */
export const TEMPLATE_BASE_DIR = path.join(TEMPLATE_DIR, 'base');

/**
 * 各形态的模板目录与交互文案，键的顺序即交互里的展示顺序。
 * 用 satisfies 而不是类型标注：新增 ProjectKind 时这里会被要求补齐，同时键名保留字面量类型。
 */
export const PROJECT_KINDS = {
  monorepo: { label: 'Monorepo (apps + packages)', dir: 'monorepo' },
  single: { label: 'Single package', dir: 'single' },
} satisfies Record<ProjectKind, IProjectKindTemplate>;

/**
 * 形态的展示顺序，取自 PROJECT_KINDS 的键顺序。
 * 键一定都是 ProjectKind（由上面的 satisfies 保证），Object.keys 丢掉的类型这里补回来。
 */
const PROJECT_KIND_ORDER = Object.keys(PROJECT_KINDS) as ProjectKind[];

/** 会被重命名作用域的子包目录。 */
export const SUBPACKAGE_DIRS = ['apps', 'packages'] as const;

/** 默认形态：不选时保持工具原本只生成 Monorepo 的行为。 */
export const DEFAULT_PROJECT_KIND: ProjectKind = PROJECT_KIND_ORDER[0];

/** 交互里可选的项目形态。 */
export const PROJECT_KIND_CHOICES: readonly IProjectKindChoice[] =
  PROJECT_KIND_ORDER.map((value) => ({
    value,
    label: PROJECT_KINDS[value].label,
  }));

/**
 * 子包目录 → 交互里的说明，同时决定展示顺序。
 * 候选集来自模板目录本身，所以新增子包只要加目录就会出现在交互里。
 * 用 Map 而不是普通对象：键来自目录名，普通对象会被 toString 这类原型属性命中。
 */
const SUBPACKAGE_LABELS = new Map<string, string>([
  ['packages/utils', 'shared utilities with a Rollup build'],
  ['packages/ui', 'shared UI components'],
  ['apps/web', 'web application'],
  ['apps/server', 'server application'],
  ['apps/mobile', 'mobile application'],
]);

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
export const DEFAULT_FOLDER_NAME = 'my-project';

// ---------- 工具函数 ----------

/** 把用户输入收敛成实际使用的目录名：去掉首尾空格并转小写。 */
export const normalizeFolderName = (input: string): string =>
  input.trim().toLowerCase();

/** 只接受普通对象：读入的 JSON 和 fs 抛出的错误都先收窄再取字段。 */
export const isPlainObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 判断外部传进来的值是不是合法形态；命令行参数和交互答案共用。 */
export const isProjectKind = (value: unknown): value is ProjectKind =>
  PROJECT_KIND_ORDER.some((kind) => kind === value);

/** 从交互返回的答案里取一个字符串字段；取不到就抛错，别让 any 流进主流程。 */
export const readStringAnswer = (answers: unknown, name: string): string => {
  const value = isPlainObject(answers) ? answers[name] : undefined;

  if (typeof value !== 'string') {
    throw new Error(`Missing answer: ${name}`);
  }

  return value;
};

/** 从交互返回的答案里取一个字符串数组字段；取不到就抛错。 */
export const readStringArrayAnswer = (
  answers: unknown,
  name: string,
): string[] => {
  const value = isPlainObject(answers) ? answers[name] : undefined;

  if (!Array.isArray(value)) {
    throw new Error(`Missing answer: ${name}`);
  }

  const items = value.filter(
    (item): item is string => typeof item === 'string',
  );

  if (items.length === 0) {
    throw new Error(`Missing answer: ${name}`);
  }

  return items;
};

/** 读取并解析一个 package.json；文件不存在或内容不是对象时返回 undefined，解析失败会抛错。 */
export const readJsonObject = async (
  filePath: string,
): Promise<JsonObject | undefined> => {
  if (!(await fs.pathExists(filePath))) {
    return undefined;
  }

  const parsed: unknown = await fs.readJson(filePath);

  return isPlainObject(parsed) ? parsed : undefined;
};

/** 写回 package.json，缩进统一在工具函数里，免得各处手写格式。 */
export const writeJsonObject = async (
  filePath: string,
  value: JsonObject,
): Promise<void> => {
  await fs.writeJson(filePath, value, { spaces: 2 });
};

/** 校验目录名；交互阶段已经拦过一次，这里给主流程兜底。 */
export const assertValidFolderName = (folderName: string): void => {
  if (!folderName) {
    throw new Error(FOLDER_NAME_REQUIRED_MESSAGE);
  }

  if (!PACKAGE_NAME_PATTERN.test(folderName)) {
    throw new Error(FOLDER_NAME_INVALID_MESSAGE);
  }
};

/** 取子包里最可用的名称片段，作为新包名的末段。 */
export const resolveSubpackageBaseName = (
  packageJson: JsonObject,
  dirName: string,
): string => {
  const declaredName = packageJson.name;

  if (typeof declaredName !== 'string' || !declaredName.trim()) {
    return dirName;
  }

  const trimmed = declaredName.trim();
  // @scope/name 取 name，裸名原样返回。
  const baseName = trimmed.slice(trimmed.lastIndexOf('/') + 1);

  return baseName.length > 0 ? baseName : dirName;
};

/** 取某个形态对应的模板目录。 */
export const resolveTemplateDir = (kind: ProjectKind): string =>
  path.join(TEMPLATE_DIR, PROJECT_KINDS[kind].dir);

/** 列出多体模板里真实存在的子包目录。 */
const listSubPackageDirs = (): string[] =>
  SUBPACKAGE_DIRS.flatMap((topDir) => {
    const topPath = path.join(resolveTemplateDir('monorepo'), topDir);

    if (!fs.existsSync(topPath)) {
      return [];
    }

    return fs
      .readdirSync(topPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${topDir}/${entry.name}`);
  });

/** 多体模式可勾选的子包；顺序取自 SUBPACKAGE_LABELS，未登记的排在后面。 */
export const resolveMonorepoSubPackages = (): ISubPackageChoice[] => {
  const available = new Set(listSubPackageDirs());
  const known = [...SUBPACKAGE_LABELS.keys()].filter((value) =>
    available.has(value),
  );
  const extra = [...available]
    .filter((value) => !SUBPACKAGE_LABELS.has(value))
    .sort();

  return [...known, ...extra].map((value) => {
    const description = SUBPACKAGE_LABELS.get(value);

    return {
      value,
      label: description ? `${value} - ${description}` : value,
    };
  });
};
