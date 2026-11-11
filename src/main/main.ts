// 主流程：交互问答、拷贝模板、改写包名；由 main/index.ts 出口对外暴露。
import path from 'node:path';

import fs from 'fs-extra';
import inquirer from 'inquirer';

import {
  DEFAULT_FOLDER_NAME,
  DEFAULT_PROJECT_KIND,
  FOLDER_NAME_EXISTS_MESSAGE,
  FOLDER_NAME_INVALID_MESSAGE,
  FOLDER_NAME_REQUIRED_MESSAGE,
  PACKAGE_NAME_PATTERN,
  PROJECT_KIND_CHOICES,
  SUBPACKAGE_DIRS,
  SUBPACKAGE_REQUIRED_MESSAGE,
  TEMPLATE_BASE_DIR,
  assertValidFolderName,
  isPlainObject,
  isProjectKind,
  normalizeFolderName,
  readJsonObject,
  readStringAnswer,
  readStringArrayAnswer,
  resolveMonorepoSubPackages,
  resolveSubpackageBaseName,
  resolveTemplateDir,
  writeJsonObject,
} from './main.config';
import type {
  ICreateProjectOptions,
  ICreateProjectResult,
  ISubPackageChoice,
  ProgressReporter,
  ProjectKind,
} from './main.type';

/** 询问项目目录名；校验规则和提示文案复用 config 里的那份。 */
const promptFolderName = async (): Promise<string> => {
  const answers: unknown = await inquirer.prompt([
    {
      type: 'input',
      name: 'folderName',
      message: 'Please enter the project folder name:',
      default: DEFAULT_FOLDER_NAME,
      validate: (input: string) => {
        if (!input || !input.trim()) {
          return FOLDER_NAME_REQUIRED_MESSAGE;
        }

        const candidate = normalizeFolderName(input);

        if (!PACKAGE_NAME_PATTERN.test(candidate)) {
          return FOLDER_NAME_INVALID_MESSAGE;
        }

        if (fs.existsSync(path.join(process.cwd(), candidate))) {
          return FOLDER_NAME_EXISTS_MESSAGE;
        }

        return true;
      },
      // filter 在 validate 之后执行，所以这里只在未配置默认值兜底。
      filter: (input: string) => (input ? normalizeFolderName(input) : ''),
    },
  ]);

  return readStringAnswer(answers, 'folderName');
};

/** 询问项目形态；默认多体，保持工具原本只生成 Monorepo 的行为。 */
const promptProjectKind = async (): Promise<ProjectKind> => {
  const answers: unknown = await inquirer.prompt([
    {
      type: 'select',
      name: 'kind',
      message: 'Which project layout do you want?',
      choices: PROJECT_KIND_CHOICES.map((choice) => ({
        name: choice.label,
        value: choice.value,
      })),
      default: DEFAULT_PROJECT_KIND,
    },
  ]);
  const kind = readStringAnswer(answers, 'kind');

  if (!isProjectKind(kind)) {
    throw new Error(`Unexpected layout answer: ${kind}`);
  }

  return kind;
};

/**
 * 收敛子包列表。
 * 只保留模板里真实存在的项，并把顺序统一成配置顺序，
 * 免得交互层或命令行传进来的值直接流进拷贝逻辑。
 * 短名（utils）和完整路径（packages/utils）都接受。
 */
const selectKnownSubPackages = (
  choices: readonly ISubPackageChoice[],
  requested: readonly string[],
): string[] =>
  choices
    .filter((choice) =>
      requested.some(
        (value) =>
          value === choice.value || value === path.basename(choice.value),
      ),
    )
    .map((choice) => choice.value);

/** 询问多体模式下要生成哪些子包。 */
const promptSubPackages = async (
  choices: readonly ISubPackageChoice[],
): Promise<string[]> => {
  const answers: unknown = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'subPackages',
      message: 'Which subpackages do you want?',
      choices: choices.map((choice) => ({
        name: choice.label,
        value: choice.value,
        checked: true,
      })),
      validate: (input: readonly string[]) =>
        input.length > 0 ? true : SUBPACKAGE_REQUIRED_MESSAGE,
    },
  ]);

  return selectKnownSubPackages(
    choices,
    readStringArrayAnswer(answers, 'subPackages'),
  );
};

/** 子包：命令行给了就按名字匹配，否则走交互；selectAll 为真时（--yes）直接全选。 */
const resolveSubPackages = async (
  requested: readonly string[] | undefined,
  options: { selectAll: boolean },
): Promise<string[]> => {
  const choices = resolveMonorepoSubPackages();

  if (!requested || requested.length === 0) {
    if (options.selectAll) {
      return choices.map((choice) => choice.value);
    }

    return promptSubPackages(choices);
  }

  const selected = selectKnownSubPackages(choices, requested);

  if (selected.length === 0) {
    throw new Error(SUBPACKAGE_REQUIRED_MESSAGE);
  }

  return selected;
};

/** 取 fs 抛出的错误码；错误是 unknown，先收窄再读。 */
const readErrorCode = (error: unknown): string | undefined => {
  if (!isPlainObject(error) || typeof error.code !== 'string') {
    return undefined;
  }

  return error.code;
};

/** 独占创建目标目录；目录已存在时直接失败，避免覆盖用户已有的文件。 */
const createTargetDirectory = async (folderName: string): Promise<string> => {
  const targetDir = path.join(process.cwd(), folderName);

  try {
    await fs.mkdir(targetDir);
  } catch (error) {
    if (readErrorCode(error) === 'EEXIST') {
      throw new Error(`The directory "${folderName}" already exists.`);
    }

    throw error;
  }

  return targetDir;
};

/** 改写根 package.json 的包名。 */
const updateRootPackageName = async (
  targetDir: string,
  packageName: string,
): Promise<void> => {
  const packageJsonPath = path.join(targetDir, 'package.json');
  const rootPackageJson = await readJsonObject(packageJsonPath);

  if (!rootPackageJson) {
    return;
  }

  rootPackageJson.name = packageName;
  await writeJsonObject(packageJsonPath, rootPackageJson);
};

/** 改写一个子包的包名；读不到 package.json 或包名取不出时原样跳过。 */
const renameSubpackage = async (
  packageJsonPath: string,
  dirName: string,
  scope: string,
): Promise<void> => {
  const packageJson = await readJsonObject(packageJsonPath);

  if (!packageJson) {
    return;
  }

  const baseName = resolveSubpackageBaseName(packageJson, dirName);

  if (!baseName) {
    return;
  }

  packageJson.name = `@${scope}/${baseName.toLowerCase()}`;
  await writeJsonObject(packageJsonPath, packageJson);
};

/** 列出目录下的子目录名；目录不存在时返回空数组。 */
const listSubDirectories = async (dirPath: string): Promise<string[]> => {
  if (!(await fs.pathExists(dirPath))) {
    return [];
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
};

/** 遍历 apps/ 与 packages/，把每个子包改写成 @<项目名>/<子包名>。 */
const updateSubpackages = async (
  rootDir: string,
  packageName: string,
): Promise<void> => {
  for (const dir of SUBPACKAGE_DIRS) {
    const subpackagesPath = path.join(rootDir, dir);
    const subDirectories = await listSubDirectories(subpackagesPath);

    for (const dirName of subDirectories) {
      const packageJsonPath = path.join(
        subpackagesPath,
        dirName,
        'package.json',
      );

      await renameSubpackage(packageJsonPath, dirName, packageName);
    }
  }
};

/** 拷贝形态模板的根级内容；apps/ 与 packages/ 由子包勾选决定，这里跳过。 */
const copyTemplateRoot = async (
  templateDir: string,
  targetDir: string,
): Promise<void> => {
  const entries = await fs.readdir(templateDir, { withFileTypes: true });

  for (const entry of entries) {
    if (SUBPACKAGE_DIRS.some((dir) => dir === entry.name)) {
      continue;
    }

    await fs.copy(
      path.join(templateDir, entry.name),
      path.join(targetDir, entry.name),
    );
  }
};

/** 按勾选结果拷贝子包，模板树和产物树保持同构。 */
const copySubPackages = async (
  templateDir: string,
  targetDir: string,
  subPackages: readonly string[],
): Promise<void> => {
  for (const subPackage of subPackages) {
    await fs.copy(
      path.join(templateDir, subPackage),
      path.join(targetDir, subPackage),
    );
  }
};

/**
 * 生成项目骨架：取目录名与形态（命令行可以预填，没给的项走交互），
 * 先铺共用知识体系，再叠加形态模板和子包，最后把包名改写成用户的项目名。
 */
export const createProject = async (
  report: ProgressReporter,
  options: ICreateProjectOptions = {},
): Promise<ICreateProjectResult> => {
  const shouldUseDefaults = options.yes === true;
  const folderName =
    options.folderName ??
    (shouldUseDefaults ? DEFAULT_FOLDER_NAME : await promptFolderName());

  assertValidFolderName(folderName);

  const kind =
    options.kind ??
    (shouldUseDefaults ? DEFAULT_PROJECT_KIND : await promptProjectKind());
  const subPackages =
    kind === 'monorepo'
      ? await resolveSubPackages(options.subPackages, {
          selectAll: shouldUseDefaults,
        })
      : [];

  report(`Creating project: ${folderName}`);

  const targetDir = await createTargetDirectory(folderName);
  const templateDir = resolveTemplateDir(kind);

  try {
    report('Copying shared config files...');
    await fs.copy(TEMPLATE_BASE_DIR, targetDir);

    // 拷贝逐个 await，不在中途并发：失败时下面的兜底要删掉整个目标目录，
    // 并发拷贝会跟着往正被删除的目录里写。
    report('Copying project template...');
    await copyTemplateRoot(templateDir, targetDir);

    if (subPackages.length > 0) {
      report('Copying subpackages...');
      await copySubPackages(templateDir, targetDir, subPackages);
    }

    report('Updating root package.json...');
    await updateRootPackageName(targetDir, folderName);

    if (kind === 'monorepo') {
      report('Updating workspace package names...');
      await updateSubpackages(targetDir, folderName);
    }
  } catch (error) {
    // 目标目录是我们独占创建的，中途失败就清掉，别在用户目录里留半个项目。
    // 清理本身再失败不能盖掉原始错误，所以这里忽略它。
    await fs.remove(targetDir).catch(() => undefined);

    throw error;
  }

  return { folderName, packageName: folderName, targetDir, kind, subPackages };
};
