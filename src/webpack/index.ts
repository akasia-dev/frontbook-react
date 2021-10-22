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
import WebpackDevServer from 'webpack-dev-server'
import boxen from 'boxen'
import chalk from 'chalk'
import chokidar from 'chokidar'
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'

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

export const createWebpackDevServer = (callback?: () => unknown) => {
  const compiler = webpack(config)
  compiler.watch(
    {
      aggregateTimeout: 300,
      poll: 1000
    },
    () => {
      if (fs.existsSync(projectScriptFilePath))
        fs.copyFileSync(projectScriptFilePath, projectContiScriptFilePath)
    }
  )

  const httpPort = String(projectConfig.port) ?? '5000'
  const server = new WebpackDevServer(
    {
      open: false,
      compress: true,
      port: httpPort,
      liveReload: true,
      hot: true,
      devMiddleware: {
        writeToDisk: true
      },
      static: [
        projectContiPath,
        ...(projectConfig.publicServePaths?.map((publicServePath) =>
          path.resolve(process.cwd(), publicServePath)
        ) || [])
      ]
    },
    compiler
  )

  server.startCallback(() => {
    console.log(
      `\n${chalk.green(
        boxen(`Frontbook Online!\nhttp://localhost:${httpPort}`, {
          padding: 1
        })
      )}`
    )
    if (callback) callback()
  })

  return { compiler, server }
}

export const devScript = async () => {
  await installContiDist()

  process.on('SIGINT', () => {
    removeComponentIndex()
    process.exit(0)
  })

  const componentPath = path.resolve(
    process.cwd(),
    projectConfig.componentFolderName ?? 'component'
  )

  let child: ChildProcessWithoutNullStreams | null = null
  const reset = async () => {
    if (child) child.kill('SIGINT')

    child = spawn('frontbook-react', ['internal-worker', '--color=always'], {
      stdio: 'pipe',
      cwd: process.cwd()
    })
    child.stdout?.pipe(process.stdout)
    child.stderr?.pipe(process.stderr)
  }

  chokidar
    .watch(componentPath, { awaitWriteFinish: true, ignoreInitial: true })
    .on('add', (filePath) => {
      console.log(
        `\n\n` +
          chalk.green(
            `A new file has been detected. Refresh the web pack.\n(Path: ${filePath})`
          )
      )
      reset()
    })
    .on('unlink', (filePath) => {
      console.log(
        `\n\n` +
          chalk.green(
            `File deletion detected. Refresh the web pack.\n(Path: ${filePath})`
          )
      )
      reset()
    })
  reset()
}
