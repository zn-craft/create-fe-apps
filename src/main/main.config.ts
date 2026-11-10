import path from 'node:path';

import fs from 'fs-extra';

import type {
  DependencyField,
  JsonObject,
  ProjectKind,
  SubPackageChoice,
} from './main.type';

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
 * 各形态独占的模板目录。
 * 拷贝顺序是 base → 形态目录，同名文件后者覆盖前者。
 */
export const TEMPLATE_KIND_DIRS: Record<ProjectKind, string> = {
  single: path.join(TEMPLATE_DIR, 'single'),
  monorepo: path.join(TEMPLATE_DIR, 'monorepo'),
};

/** 会被重命名作用域的子包目录。 */
export const SUBPACKAGE_DIRS = ['apps', 'packages'] as const;

/** 模板里用来占位的工作区作用域前缀。 */
export const TEMPLATE_SCOPE = '@template/';

/** 默认形态：不选时保持工具原本的产物。 */
export const DEFAULT_PROJECT_KIND: ProjectKind = 'monorepo';

/** 交互里可选的项目形态，顺序即展示顺序。 */
export const PROJECT_KIND_CHOICES: readonly {
  value: ProjectKind;
  label: string;
}[] = [
  { value: 'monorepo', label: 'Monorepo (apps + packages)' },
  { value: 'single', label: 'Single package' },
];

/** 多体模式可勾选的子包，顺序即拷贝顺序。 */
export const MONOREPO_SUBPACKAGE_CHOICES: readonly SubPackageChoice[] = [
  {
    value: 'packages/utils',
    label: 'packages/utils - shared utilities with a Rollup build',
  },
  { value: 'packages/ui', label: 'packages/ui - shared UI components' },
  { value: 'apps/web', label: 'apps/web - web application' },
  { value: 'apps/server', label: 'apps/server - server application' },
  { value: 'apps/mobile', label: 'apps/mobile - mobile application' },
];

/** 子包名允许出现的字符。 */
export const PACKAGE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** 参与依赖重写的三个字段。 */
export const DEPENDENCY_FIELDS: readonly DependencyField[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
];

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

/** 把模板里的 @template/xxx 依赖改写成 @<项目名>/xxx。 */
export function updatePackageDependencies(
  packageJson: JsonObject,
  packageName: string,
): void {
  for (const field of DEPENDENCY_FIELDS) {
    const value = packageJson[field];

    if (!isJsonObject(value)) {
      continue;
    }

    const updatedDeps: Record<string, string> = {};

    for (const [depName, version] of Object.entries(value)) {
      if (depName.startsWith(TEMPLATE_SCOPE)) {
        const subPackageName = depName
          .slice(TEMPLATE_SCOPE.length)
          .toLowerCase();
        updatedDeps[`@${packageName}/${subPackageName}`] = String(version);
      } else {
        updatedDeps[depName] = String(version);
      }
    }

    packageJson[field] = updatedDeps;
  }
}
