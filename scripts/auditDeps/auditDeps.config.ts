// 依赖审计的固定配置与纯函数；读写文件与流程编排在 auditDeps.ts。
import { builtinModules } from 'node:module';
import path from 'node:path';

import { isPlainObject } from '../shared/guards';
import type { ICliUsagePattern, IPackageInfo } from './auditDeps.type';

/** scripts 里会调用的 CLI，以及提供它的包。 */
export const CLI_PROVIDERS: Record<string, string> = {
  tsc: 'typescript',
  rollup: 'rollup',
  eslint: 'eslint',
  prettier: 'prettier',
  stylelint: 'stylelint',
  husky: 'husky',
  'lint-staged': 'lint-staged',
};

/**
 * CLI 的调用判定，正则提前建好，免得每个脚本重造一遍。
 * 命令名前后必须是行首行尾或分隔符，否则 `typescript` 里的 `tsc` 也会被算成调用。
 */
export const CLI_USAGE_PATTERNS: readonly ICliUsagePattern[] = Object.entries(
  CLI_PROVIDERS,
).map(([bin, provider]) => ({
  provider,
  pattern: new RegExp(`(?:^|[\\s&|])${bin}(?:\\s|$)`),
}));

/** Node 内置模块，引用了不需要在 package.json 里声明。 */
export const BUILTINS = new Set<string>([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

/** 这些目录不参与扫描。 */
export const SKIPPED_DIRS = new Set<string>(['node_modules', 'dist', '.git']);

/** 参与 import 分析的文件类型。 */
export const SOURCE_FILE_PATTERN = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

/** import 的几种写法，模块名都在第一个捕获组里。 */
const SPECIFIER_PATTERNS = [
  /(?:^|[\s;{(])(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']/g,
  /(?:^|[\s;{(])import\s*["']([^"']+)["']/g,
  /require\(\s*["']([^"']+)["']\s*\)/g,
  /import\(\s*["']([^"']+)["']\s*\)/g,
];

/** 取出文本里 import / require / 动态 import 的模块名，重复的只留一个。 */
export const collectSpecifiers = (text: string): Set<string> =>
  new Set(
    SPECIFIER_PATTERNS.flatMap((pattern) =>
      [...text.matchAll(pattern)].map((match) => match[1]),
    ),
  );

/** 判断模块名是不是外部包：相对路径、绝对路径、`#` 子路径导入、内置模块都不算。 */
export const isExternalSpecifier = (specifier: string): boolean =>
  !specifier.startsWith('.') &&
  !specifier.startsWith('/') &&
  !specifier.startsWith('#') &&
  !BUILTINS.has(specifier);

/** 把 `@scope/name/sub/path` 或 `name/sub/path` 收敛成包名。 */
export const toPackageName = (specifier: string): string => {
  const segments = specifier.split('/');

  return specifier.startsWith('@')
    ? segments.slice(0, 2).join('/')
    : segments[0];
};

/** 取某个依赖字段里声明的包名。 */
export const dependencyNames = (
  manifest: Record<string, unknown>,
  field: string,
): string[] => {
  const value = manifest[field];

  return isPlainObject(value) ? Object.keys(value) : [];
};

/** 文件归属于包含它的、最深的那个包；不在任何包内时返回 undefined。 */
export const findOwner = (
  packages: readonly IPackageInfo[],
  file: string,
): IPackageInfo | undefined => {
  let owner: IPackageInfo | undefined;

  for (const candidate of packages) {
    const isInside =
      file === candidate.dir || file.startsWith(candidate.dir + path.sep);

    if (isInside && (!owner || candidate.dir.length > owner.dir.length)) {
      owner = candidate;
    }
  }

  return owner;
};
