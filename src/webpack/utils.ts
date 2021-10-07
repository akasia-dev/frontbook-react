import path from 'path'
import fs from 'fs'
import glob from 'fast-glob'

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
  const componentPath = path.resolve(process.cwd(), 'component')

  fs.mkdirSync(tempPath, { recursive: true })

  const components = glob
    .sync(path.resolve(componentPath, '**/*.{tsx,jsx}'))
    .map((component) => {
      const componentFilePath = component
        .split(componentPath)[1]
        .replace(/\.[^/.]+$/, '')

      const pathSplit = componentFilePath.split('/')
      const kebabCaseName = pathSplit[pathSplit.length - 1]
      let pascalCaseName = pathSplit[pathSplit.length - 1].replace(
        /[-_]([a-z])/g,
        (_, letter) => letter.toUpperCase()
      )
      pascalCaseName = pascalCaseName.replace(/^[a-z]/, (match) =>
        match.toUpperCase()
      )

      const componentImportPath = `component${componentFilePath}`
      return (
        `import ${pascalCaseName} from '${componentImportPath}'\n` +
        `registerComponent('${kebabCaseName}', ${pascalCaseName})`
      )
    })

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
  fs.writeFileSync(
    path.resolve(tempPath, 'index.ts'),
    `${injectIndexCode}\n${components.join('\n\n')}`
  )
}

export const removeComponentIndex = () => {
  fs.rmSync(tempPath, { recursive: true, force: true })
}
