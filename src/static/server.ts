import Express from 'express'
import NestedStatic from 'nested-static'
import CORS from 'cors'
import http from 'http'
import boxen from 'boxen'
import chalk from 'chalk'

export const serve = async ({
  publicPath,
  httpPort
}: {
  publicPath: string
  httpPort: string
}) => {
  const expressInstance = Express()
  expressInstance.use(CORS())

  // Register Static Files
  NestedStatic(publicPath, (folders) => {
    for (let { staticPath, subPath } of folders)
      expressInstance.use(subPath, Express.static(staticPath))
  })

  const httpServer = http.createServer(expressInstance)
  httpServer.listen(httpPort, () => {
    console.log(
      '\n' +
        chalk.green(
          boxen(`Frontbook Online!\nhttp://localhost:${httpPort}`, {
            padding: 1
          })
        )
    )
  })
}
