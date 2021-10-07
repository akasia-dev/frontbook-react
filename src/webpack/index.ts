import webpack from 'webpack'
import config from './config'
import { removeComponentIndex } from './utils'

export const exportScript = async () => {
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
    removeComponentIndex()
  })
}

export const watchScript = () => {
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

      process.on('SIGINT', () => {
        removeComponentIndex()
        process.exit(0)
      })
    }
  )
}
