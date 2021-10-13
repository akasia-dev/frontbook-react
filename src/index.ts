import { IContiComponent } from './interface'

declare const window: Window & {
  frontbook: {
    demo: Record<string, IContiComponent>
  }
}

export const demo = (props: IContiComponent) => {
  return (name: string, component: (...args) => JSX.Element) => {
    if (typeof window === 'undefined') return
    window.frontbook.demo[name] = {
      ...props,
      name,
      component
    }
  }
}
