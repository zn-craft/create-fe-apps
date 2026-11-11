// main 模块的对外类型；实现在 main.ts，常量与工具函数在 main.config.ts。

// ---------- 基础类型 ----------

/** 只含字符串键值对的 JSON 对象；读入的 package.json 都先收窄成它。 */
export type JsonObject = Record<string, unknown>;

/** 项目形态：single 是单包工程，monorepo 是 apps/ + packages/ 的工作区。 */
export type ProjectKind = 'single' | 'monorepo';

// ---------- 业务实体 ----------

/** 一种形态对应的交互文案与模板目录。 */
export interface IProjectKindTemplate {
  /** 交互里展示的文案。 */
  label: string;
  /** templates/ 下的目录名。 */
  dir: string;
}

/** 交互里可选的一种项目形态。 */
export interface IProjectKindChoice {
  /** 选中后写进结果里的形态。 */
  value: ProjectKind;
  /** 交互里展示的文案。 */
  label: string;
}

/** 多体模式下可以勾选的子包。 */
export interface ISubPackageChoice {
  /** 相对项目根的路径，例如 apps/web；也是模板里的子路径。 */
  value: string;
  /** 交互里展示的文案，路径后面跟一句用途说明。 */
  label: string;
}

// ---------- 请求与响应 ----------

/** 调用方预填的答案；没给的项仍然走交互提问。 */
export interface ICreateProjectOptions {
  /** 项目目录名，同时也是包名。 */
  folderName?: string;
  /** 项目形态。 */
  kind?: ProjectKind;
  /** 多体形态要生成的子包，支持短名（utils）和完整路径（packages/utils）。 */
  subPackages?: readonly string[];
  /** 为真时所有问题取默认值，不再交互。 */
  yes?: boolean;
}

/** 主流程结束后回传给入口的信息。 */
export interface ICreateProjectResult {
  /** 用户确认后的项目目录名。 */
  folderName: string;
  /** 写进根 package.json 的包名。 */
  packageName: string;
  /** 生成出来的项目目录绝对路径。 */
  targetDir: string;
  /** 生成时选择的项目形态。 */
  kind: ProjectKind;
  /** 多体模式下实际生成的子包路径；单体模式为空数组。 */
  subPackages: string[];
}

// ---------- 函数形状 ----------

/** 进度回调；主流程只报告走到了哪一步，具体输出由入口决定。 */
export type ProgressReporter = (message: string) => void;
