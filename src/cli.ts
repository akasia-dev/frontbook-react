import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { exportScript, watchScript, devScript } from './webpack'

yargs(hideBin(process.argv))
  .scriptName('frontbook-react')
  .command('export', 'Create a result of the webpack bundles.', () =>
    exportScript()
  )
  .command(
    'watch',
    'Whenever the source code changes, a webpack result is generated.',
    () => watchScript()
  )
  .command(
    'dev',
    'Turn on the component test page server. And Whenever the source code changes, a webpack result is generated.',
    () => devScript()
  )
  .version('1.0.0')
  .demandCommand()
  .help()
  .parse()
