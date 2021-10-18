import webpack from 'webpack'
import config, { projectConfig, projectScriptFilePath } from './config'
import {
  copyDir,
  nodeModuleContiPath,
  nodeModuleContiForDevPath,
  projectContiPath,
  projectContiScriptFilePath,
  removeComponentIndex
} from './utils'
import fs from 'fs'
import path from 'path'
import { serve } from '../static/server'

export const installContiDist = async () => {
  process.env.FRONTBOOK = 'true'
  if (!fs.existsSync(path.resolve(projectContiPath, 'index.html'))) {
    if (fs.existsSync(nodeModuleContiPath)) {
      await copyDir(nodeModuleContiPath, projectContiPath)
    } else if (fs.existsSync(nodeModuleContiForDevPath)) {
      await copyDir(nodeModuleContiForDevPath, projectContiPath)
    }
  }
}

export const exportScript = async () => {
  await installContiDist()
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
  await installContiDist()

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
  await installContiDist()

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
