#!/usr/bin/env node

import { parseArgs } from 'node:util';

import { createProject } from './main';
import type { CreateProjectOptions, ProjectKind } from './main';

const HELP_TEXT = `Usage: create-fe-apps [folder] [options]

  <folder>                 Project folder name, same as --name
  -y, --yes                Use the defaults and skip every question
      --name <folder>      Project folder name
      --kind <layout>      Project layout: single | monorepo
      --subpackages <list> Subpackages for the monorepo layout, comma separated,
                           e.g. utils,ui,web (short names or apps/web)
  -h, --help               Show this help`;

/** 校验 --kind 的取值，写错时直接给出可选值。 */
function parseKind(value: string | undefined): ProjectKind | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'single' || value === 'monorepo') {
    return value;
  }

  throw new Error(
    `Unknown --kind value: ${value}. Use "single" or "monorepo".`,
  );
}

/** 把逗号分隔的 --subpackages 拆成列表，空值当作没传。 */
function parseSubPackages(value: string | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return items.length > 0 ? items : undefined;
}

/** 解析命令行参数；返回 null 表示用户要的是帮助。 */
function parseOptions(argv: string[]): CreateProjectOptions | null {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      name: { type: 'string' },
      kind: { type: 'string' },
      subpackages: { type: 'string' },
      yes: { type: 'boolean', short: 'y' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    return null;
  }

  const [folder, ...rest] = positionals;

  if (rest.length > 0) {
    throw new Error(`Unexpected argument: ${rest[0]}`);
  }

  return {
    folderName: values.name ?? folder,
    kind: parseKind(values.kind),
    subPackages: parseSubPackages(values.subpackages),
    yes: values.yes,
  };
}

/** 跑主流程并打印结果。 */
async function run(options: CreateProjectOptions): Promise<void> {
  console.log('Creating a project scaffold...\n');

  const result = await createProject(
    (message) => console.log(message),
    options,
  );

  console.log('\nProject created successfully.');
  console.log(
    `Layout: ${result.kind === 'monorepo' ? 'Monorepo' : 'Single package'}`,
  );
  console.log(`Package name: ${result.packageName}`);

  if (result.kind === 'monorepo') {
    console.log(`Workspace scope: @${result.packageName}`);
    console.log(`Subpackages: ${result.subPackages.join(', ')}`);
  }
}

/** CLI 入口：解析参数、输出和错误兜底，主流程都在 main/main.ts 里。 */
function main(): void {
  let options: CreateProjectOptions | null;

  try {
    options = parseOptions(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${message}\n\nRun "create-fe-apps --help" for usage.`);
    process.exitCode = 1;

    return;
  }

  if (!options) {
    console.log(HELP_TEXT);

    return;
  }

  run(options).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\nFailed to create the project:', message);
    process.exitCode = 1;
  });
}

main();
