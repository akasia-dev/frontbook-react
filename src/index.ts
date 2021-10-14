import { IContiComponent, IContiDemoProps } from './interface'

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
