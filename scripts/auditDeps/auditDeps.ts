// 校验模板里各包的依赖声明与实际用法是否对得上；入口是 pnpm run audit:deps，也可以传目录参数。
import fs from 'node:fs';
import path from 'node:path';

import { isPlainObject } from '../shared/guards';
import {
  CLI_USAGE_PATTERNS,
  SKIPPED_DIRS,
  SOURCE_FILE_PATTERN,
  collectSpecifiers,
  dependencyNames,
  findOwner,
  isExternalSpecifier,
  toPackageName,
} from './auditDeps.config';
import type {
  IAuditResult,
  IMissingCli,
  IMissingDependency,
  IPackageInfo,
} from './auditDeps.type';

/** 递归收集目录下的文件，SKIPPED_DIRS 里的目录整棵跳过。 */
const collectFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED_DIRS.has(entry.name)) {
      return [];
    }

    const fullPath = path.join(dir, entry.name);

    return entry.isDirectory() ? collectFiles(fullPath) : [fullPath];
  });

/** 读出扫描目录下的所有包。 */
const collectPackages = (
  files: readonly string[],
  targetDir: string,
): IPackageInfo[] =>
  files
    .filter((file) => path.basename(file) === 'package.json')
    .map((file) => {
      const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
      const manifest = isPlainObject(parsed) ? parsed : {};
      const dir = path.dirname(file);

      return {
        dir,
        label: path.relative(targetDir, dir) || '.',
        manifest,
        declared: new Set([
          ...dependencyNames(manifest, 'dependencies'),
          ...dependencyNames(manifest, 'devDependencies'),
          ...dependencyNames(manifest, 'peerDependencies'),
          ...dependencyNames(manifest, 'optionalDependencies'),
        ]),
      };
    });

/** 找出一个文件里引用了、但它所属的包没声明的依赖。 */
const findMissingInFile = (
  file: string,
  owner: IPackageInfo,
  targetDir: string,
): IMissingDependency[] => {
  const relativePath = path.relative(targetDir, file);

  return [...collectSpecifiers(fs.readFileSync(file, 'utf8'))].flatMap(
    (specifier) => {
      const name = toPackageName(specifier);
      const isUndeclared =
        isExternalSpecifier(specifier) && !owner.declared.has(name);

      return isUndeclared
        ? [{ file: relativePath, owner: owner.label, name }]
        : [];
    },
  );
};

/** 找出「代码里引用了但没声明」的依赖。 */
const findMissingDependencies = (
  files: readonly string[],
  packages: readonly IPackageInfo[],
  targetDir: string,
): IMissingDependency[] =>
  files
    .filter((file) => SOURCE_FILE_PATTERN.test(file))
    .flatMap((file) => {
      const owner = findOwner(packages, file);

      return owner ? findMissingInFile(file, owner, targetDir) : [];
    });

/** 找出一个脚本里调用了、但所属包没声明的 CLI。 */
const findMissingClisInScript = (
  pkg: IPackageInfo,
  script: string,
  command: unknown,
): IMissingCli[] => {
  if (typeof command !== 'string') {
    return [];
  }

  return CLI_USAGE_PATTERNS.filter(
    ({ provider, pattern }) =>
      pattern.test(command) && !pkg.declared.has(provider),
  ).map(({ provider }) => ({ pkg: pkg.label, script, provider }));
};

/** 找出一个包里「脚本调用了 CLI 但没声明」的项。 */
const findMissingClisInPackage = (pkg: IPackageInfo): IMissingCli[] => {
  const scripts = pkg.manifest.scripts;

  if (!isPlainObject(scripts)) {
    return [];
  }

  return Object.entries(scripts).flatMap(([script, command]) =>
    findMissingClisInScript(pkg, script, command),
  );
};

/** 找出「脚本调用了 CLI 但没声明提供它的包」。 */
const findMissingClis = (packages: readonly IPackageInfo[]): IMissingCli[] =>
  packages.flatMap(findMissingClisInPackage);

/** 打印一组问题，没有问题时什么都不输出。 */
const printIssues = <T>(
  title: string,
  issues: readonly T[],
  format: (issue: T) => string,
): void => {
  if (issues.length === 0) {
    return;
  }

  console.error(`\n${title}:`);

  for (const issue of issues) {
    console.error(`  ${format(issue)}`);
  }
};

/** 输出报告；发现问题时把进程退出码置为 1。 */
const report = (result: IAuditResult): void => {
  const { repoRoot, targetDir, packageCount } = result;

  console.log(`扫描目录: ${path.relative(repoRoot, targetDir) || '.'}`);
  console.log(`包数量: ${packageCount}`);

  printIssues(
    '代码里 import 了但没有声明的依赖',
    result.missingDependencies,
    (item) => `${item.file} -> ${item.name}   (所属包: ${item.owner})`,
  );
  printIssues(
    'scripts 里用到了 CLI 但没有声明提供它的包',
    result.missingClis,
    (item) => `${item.pkg} 的 ${item.script} 脚本需要 ${item.provider}`,
  );

  const problemCount =
    result.missingDependencies.length + result.missingClis.length;

  if (problemCount > 0) {
    console.error('\n依赖审计未通过。');
    process.exitCode = 1;

    return;
  }

  console.log('依赖审计通过。');
};

/** 入口：默认扫描仓库里的 templates/，也可以用第一个参数指定目录。 */
const main = (): void => {
  // 脚本在 src/../scripts 下，按 CommonJS 拿 __dirname 即可（tsx 也是这么执行的）。
  const repoRoot = path.resolve(__dirname, '../..');
  const targetDir = process.argv[2] ?? path.join(repoRoot, 'templates');
  const files = collectFiles(targetDir);
  const packages = collectPackages(files, targetDir);

  report({
    repoRoot,
    targetDir,
    packageCount: packages.length,
    missingDependencies: findMissingDependencies(files, packages, targetDir),
    missingClis: findMissingClis(packages),
  });
};

main();
