import webpack from 'webpack'
import config, { projectConfig, projectScriptFilePath } from './config'
import {
  copyDir,
  nodeModuleContiPath,
  projectContiPath,
  projectContiScriptFilePath,
  removeComponentIndex
} from './utils'
import fs from 'fs'
import path from 'path'
import { serve } from '../static/server'

export const exportScript = async () => {
  if (!fs.existsSync(path.resolve(projectContiPath, 'index.html')))
    await copyDir(nodeModuleContiPath, projectContiPath)

  return webpack(config).run((error, stats) => {
    if (error) console.error(error)
    if (stats)
      process.stdout.write(
        stats.toString({
          colors: true,
          modules: false,
          children: false,
          chunks: false,
          chunkModules: false
        }) + '\n'
      )

    if (fs.existsSync(projectScriptFilePath))
      fs.copyFileSync(projectScriptFilePath, projectContiScriptFilePath)
    removeComponentIndex()
  })
}

export const watchScript = async () => {
  if (!fs.existsSync(path.resolve(projectContiPath, 'index.html')))
    await copyDir(nodeModuleContiPath, projectContiPath)

  process.on('SIGINT', () => {
    removeComponentIndex()
    process.exit(0)
  })

  return webpack(config).watch(
    {
      aggregateTimeout: 300,
      poll: undefined
    },
    (error, stats) => {
      if (error) console.error(error)
      if (stats)
        process.stdout.write(
          stats.toString({
            colors: true,
            modules: false,
            children: false,
            chunks: false,
            chunkModules: false
          }) + '\n'
        )

      if (fs.existsSync(projectScriptFilePath))
        fs.copyFileSync(projectScriptFilePath, projectContiScriptFilePath)
    }
  )
}

export const devScript = async () => {
  if (!fs.existsSync(path.resolve(projectContiPath, 'index.html')))
    await copyDir(nodeModuleContiPath, projectContiPath)

  process.on('SIGINT', () => {
    removeComponentIndex()
    process.exit(0)
  })

  let isInited = false

  return webpack(config).watch(
    {
      aggregateTimeout: 300,
      poll: undefined
    },
    (error, stats) => {
      if (error) console.error(error)
      if (stats)
        process.stdout.write(
          stats.toString({
            colors: true,
            modules: false,
            children: false,
            chunks: false,
            chunkModules: false
          }) + '\n'
        )

      if (fs.existsSync(projectScriptFilePath))
        fs.copyFileSync(projectScriptFilePath, projectContiScriptFilePath)

      if (!isInited) {
        serve({
          httpPort: String(projectConfig.port) ?? '5000',
          publicPath: projectContiPath
        })
        isInited = true
      }
    }
  )
}
