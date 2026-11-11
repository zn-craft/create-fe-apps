// 校验模板里每个包的依赖声明和实际用法是否对得上。
// 覆盖两类问题：代码 import 了但没声明的包，scripts 调用了 CLI 但没声明提供它的包。
// 这些问题的共同点是本地能跑（包管理器会兜底找上层 node_modules），
// 但换到 pnpm deploy / 单包安装等场景就会断，所以需要单独把关。
//
// 用法：node scripts/auditDeps/auditDeps.mjs [要扫描的目录]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BUILTINS,
  CLI_PROVIDERS,
  SKIPPED_DIRS,
  SOURCE_FILE_PATTERN,
  collectSpecifiers,
  findOwner,
  toPackageName,
} from './auditDeps.config.mjs';

/** 递归收集目录下的所有文件。 */
function collectFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIPPED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * 读出扫描目录下的所有包。
 * @param {string[]} files 扫描到的全部文件
 * @param {string} targetDir 扫描根目录
 * @returns {import('./auditDeps.config.mjs').PackageInfo[]} 包列表
 */
function collectPackages(files, targetDir) {
  return files
    .filter((file) => path.basename(file) === 'package.json')
    .map((file) => {
      const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
      const dir = path.dirname(file);

      return {
        dir,
        label: path.relative(targetDir, dir) || '.',
        manifest,
        declared: new Set([
          ...Object.keys(manifest.dependencies ?? {}),
          ...Object.keys(manifest.devDependencies ?? {}),
          ...Object.keys(manifest.peerDependencies ?? {}),
          ...Object.keys(manifest.optionalDependencies ?? {}),
        ]),
      };
    });
}

/**
 * 找出「代码里引用了但没声明」的依赖。
 * @param {string[]} files 扫描到的全部文件
 * @param {import('./auditDeps.config.mjs').PackageInfo[]} packages 包列表
 * @param {string} targetDir 扫描根目录
 * @returns {import('./auditDeps.config.mjs').MissingDependency[]} 问题列表
 */
function findMissingDependencies(files, packages, targetDir) {
  const missing = [];

  for (const file of files) {
    if (!SOURCE_FILE_PATTERN.test(file)) {
      continue;
    }

    const owner = findOwner(packages, file);

    if (!owner) {
      continue;
    }

    const text = fs.readFileSync(file, 'utf8');

    for (const specifier of collectSpecifiers(text)) {
      const isExternal =
        !specifier.startsWith('.') &&
        !specifier.startsWith('/') &&
        !specifier.startsWith('#') &&
        !BUILTINS.has(specifier);
      const name = toPackageName(specifier);

      if (isExternal && !owner.declared.has(name)) {
        missing.push({
          file: path.relative(targetDir, file),
          owner: owner.label,
          name,
        });
      }
    }
  }

  return missing;
}

/**
 * 找出「scripts 调用了 CLI 但没声明提供它的包」。
 * @param {import('./auditDeps.config.mjs').PackageInfo[]} packages 包列表
 * @returns {import('./auditDeps.config.mjs').MissingCli[]} 问题列表
 */
function findMissingClis(packages) {
  const missing = [];

  for (const pkg of packages) {
    for (const [script, command] of Object.entries(
      pkg.manifest.scripts ?? {},
    )) {
      for (const [bin, provider] of Object.entries(CLI_PROVIDERS)) {
        const used = new RegExp(`(?:^|[\\s&|])${bin}(?:\\s|$)`).test(command);

        if (used && !pkg.declared.has(provider)) {
          missing.push({ pkg: pkg.label, script, provider });
        }
      }
    }
  }

  return missing;
}

/** 打印一组问题，没有问题时什么都不输出。 */
function printIssues(title, issues, format) {
  if (issues.length === 0) {
    return;
  }

  console.error(`\n${title}:`);

  for (const issue of issues) {
    console.error(`  ${format(issue)}`);
  }
}

/** 输出报告；发现问题时把进程退出码置为 1。 */
function report(result) {
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
}

/** 入口：默认扫描仓库里的 templates/，也可以用第一个参数指定目录。 */
function run() {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(moduleDir, '../..');
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
}

run();
