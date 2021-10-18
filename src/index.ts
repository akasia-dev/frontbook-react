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
export interface IFrontbookConfig {
  title?: string
  subtitle?: string
  description?: string
  mainColor?: string
  scriptName?: string
  docs?: {
    [docTitle: string]: string
  }

  port?: number
  webpack?: Configuration
}
