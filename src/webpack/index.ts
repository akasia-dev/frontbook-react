import webpack from 'webpack'
import config from './config'
import { removeComponentIndex } from './utils'

export const exportScript = async () => {
  return webpack(config).run((error, stats) => {
    if (error) console.error(error)
    if (stats) console.log(stats.toString())
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
      if (stats) console.log(stats.toString())
      removeComponentIndex()
    }
  )
}
