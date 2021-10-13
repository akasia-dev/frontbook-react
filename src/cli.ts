import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { exportScript, watchScript } from './webpack'

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
  .version('1.0.0')
  .demandCommand()
  .help()
  .parse()
