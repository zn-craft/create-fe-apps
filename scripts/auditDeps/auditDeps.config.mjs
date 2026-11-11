// 依赖审计用到的固定配置与纯函数。
// 这里只放不依赖具体实现、也没有副作用的内容；读写文件与流程编排在 auditDeps.mjs。
import { builtinModules } from 'node:module';
import path from 'node:path';

/** scripts 里会调用的 CLI，以及提供它的包。 */
export const CLI_PROVIDERS = {
  tsc: 'typescript',
  rollup: 'rollup',
  eslint: 'eslint',
  prettier: 'prettier',
  stylelint: 'stylelint',
  husky: 'husky',
  'lint-staged': 'lint-staged',
};

/** Node 内置模块，引用了不需要在 package.json 里声明。 */
export const BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]);

/** 这些目录不参与扫描。 */
export const SKIPPED_DIRS = new Set(['node_modules', 'dist', '.git']);

/** 参与 import 分析的文件类型。 */
export const SOURCE_FILE_PATTERN = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

/**
 * 一个包的声明信息。
 * @typedef {object} PackageInfo
 * @property {string} dir 包目录的绝对路径
 * @property {string} label 相对扫描根目录的显示名
 * @property {Record<string, unknown>} manifest package.json 的内容
 * @property {Set<string>} declared 该包声明过的依赖名
 */

/**
 * 一条「代码引用了但没声明」的记录。
 * @typedef {object} MissingDependency
 * @property {string} file 出问题的文件（相对扫描根目录）
 * @property {string} owner 文件所属的包
 * @property {string} name 少声明的包名
 */

/**
 * 一条「脚本调用了 CLI 但没声明」的记录。
 * @typedef {object} MissingCli
 * @property {string} pkg 出问题的包
 * @property {string} script 脚本名
 * @property {string} provider 少声明的包名
 */

/** 取出文本里 import / require / 动态 import 的模块名。 */
export function collectSpecifiers(text) {
  const specifiers = new Set();
  const patterns = [
    /(?:^|[\s;{(])(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']/g,
    /(?:^|[\s;{(])import\s*["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      specifiers.add(match[1]);
    }
  }

  return specifiers;
}

/** 把 `@scope/name/sub/path` 或 `name/sub/path` 收敛成包名。 */
export function toPackageName(specifier) {
  const segments = specifier.split('/');

  return specifier.startsWith('@')
    ? segments.slice(0, 2).join('/')
    : segments[0];
}

/**
 * 文件归属于离它最近的那个包。
 * @param {PackageInfo[]} packages 扫描出来的包
 * @param {string} file 文件绝对路径
 * @returns {PackageInfo | undefined} 不属于任何包时返回 undefined
 */
export function findOwner(packages, file) {
  let owner;

  for (const candidate of packages) {
    const inside =
      file === candidate.dir || file.startsWith(candidate.dir + path.sep);

    if (inside && (!owner || candidate.dir.length > owner.dir.length)) {
      owner = candidate;
    }
  }

  return owner;
}
