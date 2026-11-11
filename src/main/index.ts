/**
 * main 模块的对外出口。
 * 外层入口只从这里取用主流程函数和它的入参出参类型，不用关心内部拆成了几个文件。
 */
export { createProject } from './main';
export type { CreateProjectOptions, ProjectKind } from './main.type';
