import webpack from 'webpack'
import config from './config'

export const exportScript = () => {
  return webpack(config).run((error, stats) => {
    if (error) console.error(error)
    if (stats) console.log(stats.toString())
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
      if (stats) console.log(stats.toString())
    }
  )
}
