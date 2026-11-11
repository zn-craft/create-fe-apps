// 模板验证的用例与检查项。
// 用例只描述「用哪些参数生成」，检查项只描述「生成后跑什么」，
// 平台差异和流程编排留给 verifyTemplates.mjs。

/** 每个用例：name 用于日志，args 直接透传给 CLI。 */
export const CASES = [
  {
    name: 'monorepo-full',
    args: ['--yes', '--kind', 'monorepo'],
  },
  {
    name: 'monorepo-subset',
    args: ['--yes', '--kind', 'monorepo', '--subpackages', 'utils,web'],
  },
  {
    name: 'single',
    args: ['--yes', '--kind', 'single'],
  },
];

/** 生成项目后的安装命令。优先用本地缓存，减少网络波动带来的等待。 */
export const INSTALL_ARGS = ['install', '--prefer-offline'];

/** 生成项目后按顺序执行的检查，都在项目根目录里跑。 */
export const CHECKS = [
  { name: 'lint', args: ['run', 'lint'] },
  { name: 'typecheck', args: ['run', 'typecheck'] },
  { name: 'format:check', args: ['run', 'format:check'] },
];

/** 根 package.json 里有这个脚本时才额外跑一次构建。 */
export const BUILD_SCRIPT = 'build';
