import path from 'path'
import fs from 'fs'
import fsPromise from 'fs/promises'
import glob from 'fast-glob'
import { projectConfig, projectEntryPath } from './config'

/**
 * Resolve tsconfig.json paths to Webpack aliases
 * @param  {string} tsconfigPath           - Path to tsconfig
 * @param  {string} webpackConfigBasePath  - Path from tsconfig to Webpack config to create absolute aliases
 * @return {object}                        - Webpack alias config
 */
export const resolveTsconfigPathsToAlias = ({
  tsconfigPath = './tsconfig.json',
  webpackConfigBasePath = __dirname
} = {}) => {
  const config = fs.existsSync(tsconfigPath)
    ? require(tsconfigPath).compilerOptions
    : {}

  const aliases = {}

  if (config.paths) {
    Object.keys(config.paths).forEach((item) => {
      const key = item.replace('/*', '')
      const value = path.resolve(
        webpackConfigBasePath,
        config.paths[item][0].replace('/*', '').replace('*', '')
      )
      aliases[key] = value
    })
  }

  return aliases
}

export const tempPath = path.resolve(process.cwd(), '.frontbook/build')

export const createComponentIndex = () => {
  const componentPath = path.resolve(
    process.cwd(),
    projectConfig.componentFolderName ?? 'component'
  )

  fs.mkdirSync(tempPath, { recursive: true })

  const components = glob
    .sync(path.resolve(componentPath, '**/*.{tsx,jsx}'), {
      ignore: ['**/*.*.{tsx,jsx}']
    })
    .map((component) => {
      const componentFilePath = component
        .split(componentPath)[1]
        .replace(/\.[^/.]+$/, '')

      const pathSplit = componentFilePath.split('/')
      let kebabCaseName = pathSplit[pathSplit.length - 1]
        .match(
          /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
        )
        ?.map((x) => x.toLowerCase())
        .join('-')

      let pascalCaseName = pathSplit[pathSplit.length - 1].replace(
        /[-_]([a-z])/g,
        (_, letter) => letter.toUpperCase()
      )
      pascalCaseName = pascalCaseName.replace(/^[a-z]/, (match) =>
        match.toUpperCase()
      )

      const componentImportPath = `${
        projectConfig.componentFolderName ?? 'component'
      }${componentFilePath}`

      if (projectConfig?.ignnoreComponents?.includes(componentImportPath))
        return null

      return (
        `import ${pascalCaseName} from '${componentImportPath}'\n` +
        `try {` +
        `  registerComponent('${kebabCaseName}', ${pascalCaseName})` +
        `} catch (e) {}`
      )
    })
    .filter((x) => x !== null) as string[]

  const injectCodeFolderPath = path.resolve(
    __dirname,
    '../..',
    'src',
    'webpack',
    'inject'
  )

  const injectModuleCode = String(
    fs.readFileSync(path.resolve(injectCodeFolderPath, 'module.ts'))
  )
  fs.writeFileSync(path.resolve(tempPath, 'module.ts'), injectModuleCode)

  const injectIndexCode = String(
    fs.readFileSync(path.resolve(injectCodeFolderPath, 'index.ts'))
  )

  const demoFunctions = glob
    .sync(path.resolve(componentPath, '**/*.demo.{tsx,jsx}'), {})
    .map((demoFunction) => {
      const demoFunctionFilePath = demoFunction
        .split(componentPath)[1]
        .replace(/\.[^/.]+$/, '')

      const pathSplit = demoFunctionFilePath.replace(/\.[^/.]+$/, '').split('/')
      const kebabCaseName = pathSplit[pathSplit.length - 1]
        .match(
          /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
        )
        ?.map((x) => x.toLowerCase())
        .join('-')
      let pascalCaseName = pathSplit[pathSplit.length - 1].replace(
        /[-_]([a-z])/g,
        (_, letter) => letter.toUpperCase()
      )
      pascalCaseName = pascalCaseName.replace(/^[a-z]/, (match) =>
        match.toUpperCase()
      )

      const componentImportPath = `${
        projectConfig.componentFolderName ?? 'component'
      }${demoFunctionFilePath}`

      // This is an exception to the possibility that only demonstrations exist and there are no components.
      const actualComponentVariable = `eval(\`typeof ${pascalCaseName} !== 'undefined' ? ${pascalCaseName} : undefined\`)`
      return (
        `import ${pascalCaseName}DemoFunction from '${componentImportPath}'\n` +
        `try {` +
        `  ${pascalCaseName}DemoFunction('${kebabCaseName}', ${actualComponentVariable})` +
        `} catch (e) {}`
      )
    })

  let additionalCode = ''
  if (projectConfig.title)
    additionalCode += `  window.frontbook.title = '${projectConfig.title}'\n`
  if (projectConfig.subtitle)
    additionalCode += `  window.frontbook.subtitle = '${projectConfig.subtitle}'\n`
  if (projectConfig.description)
    additionalCode += `  window.frontbook.description = '${projectConfig.description}'\n`
  if (projectConfig.mainColor)
    additionalCode += `  window.frontbook.mainColor = '${projectConfig.mainColor}'\n`
  if (projectConfig.scriptName)
    additionalCode += `  window.frontbook.scriptName = '${projectConfig.scriptName}'\n`

  if (projectConfig.docs)
    additionalCode += `  window.frontbook.docs = ${JSON.stringify(
      projectConfig.docs
    )}\n`

  let entryInjectCode = fs.existsSync(projectEntryPath)
    ? `\n\nimport '../../frontbook.entry'\n`
    : ``

  fs.writeFileSync(
    path.resolve(tempPath, 'index.ts'),
    `${injectIndexCode}\n${components.join('\n\n')}\n\n${demoFunctions.join(
      '\n\n'
    )}${
      additionalCode.length > 0
        ? `\n\nif (typeof window !== "undefined") {\n${additionalCode}}`
        : ``
    }${entryInjectCode}`
  )
}

export const removeComponentIndex = () => {
  fs.rmSync(tempPath, { recursive: true, force: true })
}

export const copyDir = async (src: string, dest: string) => {
  await fsPromise.mkdir(dest, { recursive: true })
  let entries = await fsPromise.readdir(src, { withFileTypes: true })

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name)
    let destPath = path.join(dest, entry.name)

    entry.isDirectory()
      ? await copyDir(srcPath, destPath)
      : await fsPromise.copyFile(srcPath, destPath)
  }
}

export const nodeModuleContiPath = path.resolve(
  process.cwd(),
  'node_modules',
  'frontbook-conti-dist',
  'out'
)

export const nodeModuleContiForDevPath = path.resolve(
  process.cwd(),
  'node_modules',
  'frontbook-react',
  'node_modules',
  'frontbook-conti-dist',
  'out'
)

export const projectContiPath = path.resolve(
  process.cwd(),
  '.frontbook',
  'conti'
)

export const projectContiScriptFilePath = path.resolve(
  process.cwd(),
  '.frontbook',
  'conti',
  'component.js'
)
