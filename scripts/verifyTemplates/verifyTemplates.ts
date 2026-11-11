// 在临时目录里按几种组合生成项目、装依赖并跑模板自带的检查；模板改动后靠它兜底。
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { isPlainObject } from '../shared/guards';
import {
  BUILD_SCRIPT,
  CASES,
  CHECKS,
  INSTALL_ARGS,
} from './verifyTemplates.config';
import type { IRunStep, IVerifyCase } from './verifyTemplates.type';

// 脚本在仓库根的 scripts/ 下，按 CommonJS 拿 __dirname 即可（tsx 也是这么执行的）。
const repoRoot = path.resolve(__dirname, '../..');
const cliPath = path.join(repoRoot, 'dist', 'index.js');
const projectName = 'project';
const shouldKeepTemp = process.argv.includes('--keep');

// pnpm run 会把 pnpm 自己的入口写进 npm_execpath。
// 它可能是 JS 入口，也可能是原生可执行文件（例如独立安装的 pnpm.exe），两种都要支持，
// 这样才能绕开在 Windows 上经 shell 调用 pnpm.cmd 的弃用警告。
const pnpmEntry = process.env.npm_execpath ?? '';
const isPnpmEntryScript = /\.(?:cjs|mjs|js)$/i.test(pnpmEntry);

/** 同步执行一条命令，退出码非 0 就抛错。 */
const runStep = ({ label, command, args, cwd }: IRunStep): void => {
  console.log(`\n▶ ${label}: ${args.join(' ')}`);

  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${label} 退出码 ${result.status}`);
  }
};

/** 跑 pnpm：JS 入口交给当前 Node，原生可执行文件直接调用。 */
const runPnpm = (label: string, args: readonly string[], cwd: string): void => {
  if (isPnpmEntryScript) {
    runStep({
      label,
      command: process.execPath,
      args: [pnpmEntry, ...args],
      cwd,
    });

    return;
  }

  runStep({ label, command: pnpmEntry, args, cwd });
};

/** 读出生成项目的 scripts 字段；没有这个字段时按空对象处理。 */
const readScripts = (projectDir: string): Record<string, unknown> => {
  const manifestPath = path.join(projectDir, 'package.json');
  const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const scripts = isPlainObject(parsed) ? parsed.scripts : undefined;

  return isPlainObject(scripts) ? scripts : {};
};

/** 生成一个用例并跑完它的所有检查。 */
const verifyCase = (testCase: IVerifyCase, workspace: string): void => {
  const caseDir = path.join(workspace, testCase.name);
  const projectDir = path.join(caseDir, projectName);

  fs.mkdirSync(caseDir, { recursive: true });

  runStep({
    label: `${testCase.name} 生成`,
    command: process.execPath,
    args: [cliPath, ...testCase.args, '--name', projectName],
    cwd: caseDir,
  });
  runPnpm(`${testCase.name} 安装依赖`, INSTALL_ARGS, projectDir);

  for (const check of CHECKS) {
    runPnpm(`${testCase.name} ${check.name}`, check.args, projectDir);
  }

  if (readScripts(projectDir)[BUILD_SCRIPT]) {
    runPnpm(`${testCase.name} build`, ['run', BUILD_SCRIPT], projectDir);
  }
};

const main = (): void => {
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
  const failures: string[] = [];

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
    if (shouldKeepTemp) {
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
};

main();
