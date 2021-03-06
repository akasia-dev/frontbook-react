import webpack from 'webpack'
import config, { projectConfig, projectScriptFilePath } from './config'
import {
  copyDir,
  nodeModuleContiPath,
  nodeModuleContiForDevPath,
  projectContiPath,
  projectContiScriptFilePath,
  removeComponentIndex,
  tempPath
} from './utils'
import fs from 'fs'
import path from 'path'
import WebpackDevServer from 'webpack-dev-server'
import boxen from 'boxen'
import chalk from 'chalk'
import chokidar from 'chokidar'
import { ChildProcessByStdio, spawn } from 'child_process'
import which from 'which'
import { Readable } from 'stream'
import merge from 'webpack-merge'

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
  console.log(chalk.green(`Starting Frontbook Webpack Server...`))
  const compiler = webpack(
    projectConfig.disableHMR !== true
      ? merge(config, {
          mode: 'development',
          entry: {
            app: [
              'webpack-dev-server/client/index.js?hot=true&live-reload=true',
              path.join(tempPath, 'index.ts')
            ]
          },
          output: {
            hotUpdateChunkFilename: 'build/hot-update.js',
            hotUpdateMainFilename: 'build/hot-update.json'
          },
          plugins: [new webpack.HotModuleReplacementPlugin()]
        })
      : config
  )

  let isFirstCompile = true
  let isFirstNotification = true
  compiler.watch(
    {
      aggregateTimeout: 300,
      poll: 1000
    },
    () => {
      if (fs.existsSync(projectScriptFilePath))
        fs.copyFileSync(projectScriptFilePath, projectContiScriptFilePath)

      setTimeout(() => {
        console.log(
          `\n${chalk.green(
            boxen(`Frontbook Online!\nhttp://localhost:${httpPort}`, {
              padding: 1
            })
          )}\n`
        )

        const isProcessNotFirstRun =
          process.argv.length > 3 && process.argv[3] === 'firstTime'

        if (!isProcessNotFirstRun) {
          if (isFirstNotification) {
            isFirstNotification = false
          } else {
            console.log('\n' + chalk.green(`Rebuilding has been completed.`))
          }
          return
        }
      }, 100)

      if (isFirstCompile) {
        isFirstCompile = false
      }
    }
  )

  const httpPort = String(projectConfig.port) ?? '5010'
  const server = new WebpackDevServer(
    {
      open: false,
      compress: true,
      port: httpPort,
      liveReload: projectConfig.disableHMR !== true,
      hot: false,
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
    if (callback) callback()
  })

  return { compiler, server }
}

export const devScript = async () => {
  console.log(chalk.green(`Starting Frontbook Server...`))
  await installContiDist()

  process.on('SIGINT', () => {
    removeComponentIndex()
    process.exit(0)
  })

  const componentPath = path.resolve(
    process.cwd(),
    projectConfig.componentFolderName ?? 'component'
  )

  let child: ChildProcessByStdio<null, null, Readable> | undefined = undefined
  const reset = async (isFirst = false) => {
    if (typeof child?.kill === 'function') child?.kill()
    let frontbookReactPath = which.sync('frontbook-react', {
      nothrow: true
    })
    if (!frontbookReactPath) {
      console.log(chalk.red(`frontbook-react not found.`))
      return
    }

    child = spawn(
      frontbookReactPath,
      isFirst ? ['internal-worker', 'firstTime'] : ['internal-worker'],
      {
        stdio: [process.stdin, process.stdout, 'pipe'],
        cwd: process.cwd(),
        shell: true
      }
    )
  }

  if (projectConfig.disableHMR !== true) {
    chokidar
      .watch(componentPath, { ignoreInitial: true })
      .on('change', () => {
        console.log(
          '' + chalk.green(`File change detected. Rebuild is in progress...`)
        )
      })
      .on('add', (filePath) => {
        console.log(
          `\n\n` +
            chalk.green(
              `A new file has been detected. Refresh the webpack.\n(Path: ${filePath})\n`
            )
        )
        reset()
      })
      .on('unlink', (filePath) => {
        console.log(
          `\n\n` +
            chalk.green(
              `File deletion detected. Refresh the webpack.\n(Path: ${filePath})\n`
            )
        )
        reset()
      })
  }
  reset(true)
}
