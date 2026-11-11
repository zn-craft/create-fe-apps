// 依赖审计的类型声明；常量与纯函数在 auditDeps.config.ts，读写与流程在 auditDeps.ts。

/** 扫描到的一个包。 */
export interface IPackageInfo {
  /** 包目录的绝对路径。 */
  dir: string;
  /** 相对扫描根目录的显示名，根目录本身显示为 `.`。 */
  label: string;
  /** package.json 的内容，读取时已收窄成普通对象。 */
  manifest: Record<string, unknown>;
  /** 四个依赖字段合并后的包名，用来判断某个引用是否已声明。 */
  declared: Set<string>;
}

/** 一条「代码 import 了但没声明」的记录。 */
export interface IMissingDependency {
  /** 出问题的文件，相对扫描根目录。 */
  file: string;
  /** 文件所属的包。 */
  owner: string;
  /** 少声明的包名。 */
  name: string;
}

/** 一条「脚本调用了 CLI 但没声明提供它的包」的记录。 */
export interface IMissingCli {
  /** 出问题的包。 */
  pkg: string;
  /** 脚本名。 */
  script: string;
  /** 少声明的包名。 */
  provider: string;
}

/** 一个 CLI 名对应的命令匹配规则，提前建好，免得每个脚本重造正则。 */
export interface ICliUsagePattern {
  /** 提供这个 CLI 的包名。 */
  provider: string;
  /** 匹配 `script` 字段里是否真的调用了这个命令。 */
  pattern: RegExp;
}

/** 一次审计的结果。 */
export interface IAuditResult {
  /** 仓库根目录，用来把绝对路径显示成相对路径。 */
  repoRoot: string;
  /** 本次扫描的根目录，默认是 templates/。 */
  targetDir: string;
  /** 扫到的包数量。 */
  packageCount: number;
  /** 代码引用但没声明的依赖。 */
  missingDependencies: IMissingDependency[];
  /** 脚本用到但没声明的 CLI。 */
  missingClis: IMissingCli[];
}
