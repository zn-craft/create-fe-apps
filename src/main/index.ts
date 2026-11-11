// main 模块的出口：入口只从这里取主流程函数、参数类型和形态谓词。
export { createProject } from './main';
export { isProjectKind } from './main.config';
export type {
  ICreateProjectOptions,
  ICreateProjectResult,
  ProjectKind,
} from './main.type';
