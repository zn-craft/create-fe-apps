/** 一个只含字符串键值对的 JSON 对象。 */
export type JsonObject = Record<string, unknown>;

/** 项目形态：单体是单包工程，多体是 apps + packages 的 Monorepo。 */
export type ProjectKind = 'single' | 'monorepo';

/** 多体模式下可以勾选的子包。 */
export interface SubPackageChoice {
  /** 相对项目根的路径，例如 apps/web。 */
  value: string;
  /** 交互里展示的文案。 */
  label: string;
}

/** 调用方预填的答案；没给的项仍然走交互提问。 */
export interface CreateProjectOptions {
  /** 项目目录名。 */
  folderName?: string;
  /** 项目形态。 */
  kind?: ProjectKind;
  /** 多体形态要生成的子包，支持短名（utils）和完整路径（packages/utils）。 */
  subPackages?: readonly string[];
  /** 其余问题一律取默认值，不再交互。 */
  yes?: boolean;
}

/** 主流程结束后回传给入口的信息。 */
export interface CreateProjectResult {
  /** 用户确认后的项目目录名，同时也是包名。 */
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

/**
 * 进度回调。
 * 主流程只负责报告走到了哪一步，具体怎么输出由入口决定，
 * 这样 console 就只出现在 src/index.ts 里。
 */
export type ProgressReporter = (message: string) => void;
