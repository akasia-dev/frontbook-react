import express from 'express'
import cors from 'cors'
import http from 'http'
import boxen from 'boxen'
import chalk from 'chalk'
import nestedStatic from 'nested-static'

export const serve = async ({
  publicPaths,
  httpPort
}: {
  publicPaths: string[]
  httpPort: string
}) => {
  const expressInstance = express()
  expressInstance.use(cors())

  // Register Static Files
  for (const publicPath of publicPaths) {
    nestedStatic(publicPath, (folders) =>
      folders.map(({ staticPath, subPath }) =>
        expressInstance.use(subPath, express.static(staticPath))
      )
    )
  }

  http.createServer(expressInstance).listen(httpPort, () => {
    console.log(
      `\n${chalk.green(
        boxen(`Frontbook Online!\nhttp://localhost:${httpPort}`, {
          padding: 1
        })
      )}`
    )
  })
}
