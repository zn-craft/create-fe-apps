// 模板验证的类型声明；用例与检查项在 verifyTemplates.config.ts，流程在 verifyTemplates.ts。

/** 一个生成用例。 */
export interface IVerifyCase {
  /** 日志里的用例名，同时用作临时子目录名。 */
  name: string;
  /** 透传给 CLI 的参数。 */
  args: string[];
}

/** 生成项目后按顺序执行的一条检查。 */
export interface IVerifyCheck {
  /** 日志里的检查名。 */
  name: string;
  /** 透传给 pnpm 的参数，例如 `['run', 'lint']`。 */
  args: string[];
}

/** 一条要同步执行的命令。 */
export interface IRunStep {
  /** 日志前缀，说明这一步在做什么。 */
  label: string;
  /** 可执行文件。 */
  command: string;
  /** 传给它的参数。 */
  args: readonly string[];
  /** 在哪个目录里执行。 */
  cwd: string;
}
