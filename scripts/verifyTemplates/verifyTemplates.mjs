// 在临时目录里按几种组合生成项目，装上依赖并跑模板自带的检查。
// templates/ 被 ESLint 和 Prettier 忽略，没有自动兜底，所以改完模板应该跑这个脚本。
//
// 用法：pnpm run verify:templates [-- --keep]
//   加 --keep 时不删除临时目录，方便进去手工排查。
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BUILD_SCRIPT,
  CASES,
  CHECKS,
  INSTALL_ARGS,
} from './verifyTemplates.config.mjs';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, '../..');
const cliPath = path.join(repoRoot, 'dist', 'index.js');
const projectName = 'project';
const keepTemp = process.argv.includes('--keep');

// pnpm run 会把 pnpm 自己的入口写进 npm_execpath。
// 它可能是 JS 入口，也可能是原生可执行文件（例如独立安装的 pnpm.exe），两种都要支持，
// 这样才能绕开在 Windows 上经 shell 调用 pnpm.cmd 的弃用警告。
const pnpmEntry = process.env.npm_execpath;
const pnpmIsScript =
  typeof pnpmEntry === 'string' && /\.(?:cjs|mjs|js)$/i.test(pnpmEntry);

/** 同步执行一条命令，退出码非 0 就抛错。 */
function runStep(label, command, args, cwd) {
  console.log(`\n▶ ${label}: ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${label} 退出码 ${result.status}`);
  }
}

/** 跑 pnpm：JS 入口交给当前 Node，原生可执行文件直接调用。 */
function runPnpm(label, args, cwd) {
  if (pnpmIsScript) {
    runStep(label, process.execPath, [pnpmEntry, ...args], cwd);

    return;
  }

  runStep(label, pnpmEntry, args, cwd);
}

/** 生成一个用例并跑完它的所有检查。 */
function verifyCase(testCase, workspace) {
  const caseDir = path.join(workspace, testCase.name);
  const projectDir = path.join(caseDir, projectName);

  fs.mkdirSync(caseDir, { recursive: true });

  runStep(
    `${testCase.name} 生成`,
    process.execPath,
    [cliPath, ...testCase.args, '--name', projectName],
    caseDir,
  );
  runPnpm(`${testCase.name} 安装依赖`, INSTALL_ARGS, projectDir);

  for (const check of CHECKS) {
    runPnpm(`${testCase.name} ${check.name}`, check.args, projectDir);
  }

  const manifest = JSON.parse(
    fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'),
  );

  if (manifest.scripts?.[BUILD_SCRIPT]) {
    runPnpm(`${testCase.name} build`, ['run', BUILD_SCRIPT], projectDir);
  }
}

function main() {
  if (!pnpmEntry) {
    console.error('找不到 pnpm 入口，请用 pnpm run verify:templates 运行。');
    process.exitCode = 1;

    return;
  }

  if (!fs.existsSync(cliPath)) {
    console.error('找不到 dist/index.js，请先跑 pnpm run build。');
    process.exitCode = 1;

    return;
  }

  const workspace = fs.mkdtempSync(
    path.join(os.tmpdir(), 'create-fe-apps-verify-'),
  );
  const failures = [];

  try {
    for (const testCase of CASES) {
      try {
        verifyCase(testCase, workspace);
        console.log(`\n${testCase.name} 通过`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(testCase.name);
        console.error(`\n${testCase.name} 失败: ${message}`);
      }
    }
  } finally {
    if (keepTemp) {
      console.log(`\n临时目录保留在: ${workspace}`);
    } else {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }

  if (failures.length > 0) {
    console.error(`\n模板验证未通过: ${failures.join(', ')}`);
    process.exitCode = 1;

    return;
  }

  console.log('\n模板验证通过。');
}

main();
