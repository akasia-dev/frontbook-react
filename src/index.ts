import { IContiComponent, IContiDemoProps } from './interface'
import type { Configuration } from 'webpack'

declare const window: Window & {
  frontbook: {
    demo: IContiComponent[]
  }
}

export const demo = (props: IContiDemoProps) => {
  return (name: string, component: (...args) => JSX.Element) => {
    if (typeof window === 'undefined') return
    if (typeof window.frontbook.demo === 'undefined') window.frontbook.demo = []
    window.frontbook.demo.push({
      ...props,
      name,
      component
    })
  }
}

/**
 * Frontbook config file interface
 * (.frontbook.config.ts)
 */
export interface IFrontbookConfig {
  /**
   * Browser Title bar of demo page
   */
  title?: string
  /**
   * Subtitle of demo page
   */
  subtitle?: string
  /**
   * Description of demo page
   */
  description?: string
  /**
   * Main color of demo page
   * (mostly background color)
   */
  mainColor?: string
  /**
   * The name of the script file to be downloaded.
   * @example
   * 'frontbook@1.0.0'
   */
  scriptName?: string
  /**
   * List of documents link to be displayed
   * at the top right of the demo page.
   * @example
   * docs: {
   *  "Github Link": "https://github.com/akasia-dev/frontbook"
   * }
   */
  docs?: {
    [docTitle: string]: string
  }

  /**
   * Port number of demo page server
   * @default 5000
   */
  port?: number

  /**
   * Webpack settings to be used when building
   * demo components (defaultly embedded webpack setup
   * is not to be deleted and will be merged)
   */
  webpack?: Configuration
}
