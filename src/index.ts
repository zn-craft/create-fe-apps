#!/usr/bin/env node

import { createProject } from './main';

/** CLI 入口：负责输出和错误兜底，主流程都在 main/main.ts 里。 */
async function run(): Promise<void> {
  console.log('Creating a project scaffold...\n');

  const result = await createProject((message) => console.log(message));

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

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('\nFailed to create the project:', message);
  process.exitCode = 1;
});
