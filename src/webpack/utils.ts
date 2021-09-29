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

export const basedCode = `import React from 'react'
import ReactDOM from 'react-dom'
import reactToWebComponent from 'react-to-webcomponent'

const registerComponent = <T>(kebabName: string, component: React.FC<T>) => {
  if (
    typeof window !== 'undefined' &&
    typeof window.customElements !== 'undefined' &&
    typeof component !== 'undefined'
  ) {
    window.customElements.define(
      kebabName,
      reactToWebComponent(component, React, ReactDOM, {
        shadow: false
      })
    )
  }
}
`

export const tempPath = path.resolve(process.cwd(), 'core/webpack/_temp/')

export const createComponentIndex = () => {
  const indexTsPath = path.resolve(tempPath, 'index.ts')
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

  const code = `${basedCode}\n${components.join('\n\n')}`
  fs.writeFileSync(indexTsPath, code)
}

export const removeComponentIndex = () => {
  fs.rmSync(tempPath, { recursive: true, force: true })
}
