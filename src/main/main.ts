import path from 'node:path';

import fs from 'fs-extra';
import inquirer from 'inquirer';

import {
  DEFAULT_PROJECT_KIND,
  FOLDER_NAME_EXISTS_MESSAGE,
  FOLDER_NAME_INVALID_MESSAGE,
  FOLDER_NAME_REQUIRED_MESSAGE,
  MONOREPO_SUBPACKAGE_CHOICES,
  PACKAGE_NAME_PATTERN,
  PROJECT_KIND_CHOICES,
  SUBPACKAGE_DIRS,
  SUBPACKAGE_REQUIRED_MESSAGE,
  TEMPLATE_BASE_DIR,
  TEMPLATE_KIND_DIRS,
  assertValidFolderName,
  normalizeFolderName,
  readJsonObject,
  resolveSubpackageBaseName,
  updatePackageDependencies,
  writeJsonObject,
} from './main.config';
import type {
  CreateProjectResult,
  ProgressReporter,
  ProjectKind,
} from './main.type';

/** 询问项目目录名。校验规则和提示文案复用 config 里的那份。 */
async function promptFolderName(): Promise<string> {
  const answers = (await inquirer.prompt([
    {
      type: 'input',
      name: 'folderName',
      message: 'Please enter the project folder name:',
      default: 'my-monorepo-project',
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
  ])) as { folderName: string };

  return answers.folderName;
}

/** 询问项目形态。默认多体，保持工具原本只生成 Monorepo 的行为。 */
async function promptProjectKind(): Promise<ProjectKind> {
  const answers = (await inquirer.prompt([
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
  ])) as { kind: ProjectKind };

  return answers.kind;
}

/**
 * 收敛交互返回的子包列表。
 * 只保留配置里声明过的路径，并把顺序统一成配置顺序，
 * 免得交互层以外的值流进拷贝逻辑。
 */
function selectKnownSubPackages(values: readonly string[]): string[] {
  return MONOREPO_SUBPACKAGE_CHOICES.map((choice) => choice.value).filter(
    (value) => values.includes(value),
  );
}

/** 询问多体模式下要生成哪些子包。 */
async function promptSubPackages(): Promise<string[]> {
  const answers = (await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'subPackages',
      message: 'Which subpackages do you want?',
      choices: MONOREPO_SUBPACKAGE_CHOICES.map((choice) => ({
        name: choice.label,
        value: choice.value,
        checked: true,
      })),
      validate: (input: readonly string[]) =>
        input.length > 0 ? true : SUBPACKAGE_REQUIRED_MESSAGE,
    },
  ])) as { subPackages: string[] };

  return selectKnownSubPackages(answers.subPackages);
}

/**
 * 独占创建目标目录。
 * 目录已存在时直接失败，避免覆盖用户已有文件。
 */
async function createTargetDirectory(folderName: string): Promise<string> {
  const targetDir = path.join(process.cwd(), folderName);

  try {
    await fs.mkdir(targetDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`The directory "${folderName}" already exists.`);
    }

    throw error;
  }

  return targetDir;
}

/** 改写根 package.json 的包名。 */
async function updateRootPackageName(
  targetDir: string,
  packageName: string,
): Promise<void> {
  const packageJsonPath = path.join(targetDir, 'package.json');
  const rootPackageJson = await readJsonObject(packageJsonPath);

  if (!rootPackageJson) {
    return;
  }

  rootPackageJson.name = packageName;
  await writeJsonObject(packageJsonPath, rootPackageJson);
}

/** 遍历 apps/ 与 packages/，改写每个子包的包名和依赖引用。 */
async function updateSubpackages(
  rootDir: string,
  packageName: string,
): Promise<void> {
  for (const dir of SUBPACKAGE_DIRS) {
    const subpackagesPath = path.join(rootDir, dir);

    if (!(await fs.pathExists(subpackagesPath))) {
      continue;
    }

    const entries = await fs.readdir(subpackagesPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const packageJsonPath = path.join(
        subpackagesPath,
        entry.name,
        'package.json',
      );
      const packageJson = await readJsonObject(packageJsonPath);

      if (!packageJson) {
        continue;
      }

      const baseName = resolveSubpackageBaseName(packageJson, entry.name);

      if (!baseName) {
        continue;
      }

      packageJson.name = `@${packageName}/${baseName.toLowerCase()}`;

      updatePackageDependencies(packageJson, packageName);

      await writeJsonObject(packageJsonPath, packageJson);
    }
  }
}

/**
 * 拷贝形态模板的根级内容。
 * apps/ 与 packages/ 由子包勾选决定，这里跳过。
 */
async function copyTemplateRoot(
  templateDir: string,
  targetDir: string,
): Promise<void> {
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
}

/** 按勾选结果拷贝子包，模板树和产物树保持同构。 */
async function copySubPackages(
  templateDir: string,
  targetDir: string,
  subPackages: readonly string[],
): Promise<void> {
  for (const subPackage of subPackages) {
    await fs.copy(
      path.join(templateDir, subPackage),
      path.join(targetDir, subPackage),
    );
  }
}

/**
 * 生成项目骨架：交互取目录名和形态，先铺共用知识体系，再叠加形态模板和子包，
 * 最后把包名改写成用户的项目名。
 */
export async function createProject(
  report: ProgressReporter,
): Promise<CreateProjectResult> {
  const folderName = await promptFolderName();
  assertValidFolderName(folderName);

  const kind = await promptProjectKind();
  const subPackages = kind === 'monorepo' ? await promptSubPackages() : [];

  report(`Creating project: ${folderName}`);

  const targetDir = await createTargetDirectory(folderName);
  const templateDir = TEMPLATE_KIND_DIRS[kind];

  report('Copying shared config files...');
  await fs.copy(TEMPLATE_BASE_DIR, targetDir);

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

  return { folderName, packageName: folderName, targetDir, kind, subPackages };
}
