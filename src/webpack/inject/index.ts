/**
 * @description
 * This code is for injection
 * within the user project.
 * (not actually used in this path)
 */

import React from 'react'
import ReactDOM from 'react-dom'
import reactToWebComponent from './module'

export type UseEffectCleanUpType = (() => unknown) | undefined
export type UseEffectType =
  | ((component: HTMLElement) => UseEffectCleanUpType)
  | undefined
export type UpdaterType = (component: HTMLElement) => unknown
export type UpdateType = (name: string, updater: UpdaterType) => unknown

export interface IFrontbook {
  instances: Record<string, HTMLElement[]>
  elements: Record<string, typeof HTMLElement>
  update: UpdateType
  react: (props: {
    name: string
    props?: Record<string, any>
    useEffect: UseEffectType
  }) => unknown
  registerComponent: (kebabName: string, component: any) => void

  title?: string
  subtitle?: string
  description?: string
  mainColor?: string
  scriptName?: string
  docs?: Record<string, string>
}

declare const window: any

export const registerComponent = (kebabName: string, component: any) => {
  if (
    typeof window !== 'undefined' &&
    typeof window.customElements !== 'undefined' &&
    typeof component !== 'undefined'
  ) {
    const element = reactToWebComponent(component, React, ReactDOM, {
      shadow: false
    }) as any
    window.customElements.define(kebabName, element)
    window.frontbook.elements[kebabName] = element
  }
}

if (typeof window !== 'undefined') {
  if (typeof window.frontbook === 'undefined') window.frontbook = {}
  if (typeof window.frontbook.instances === 'undefined')
    window.frontbook.instances = {}
  if (typeof window.frontbook.elements === 'undefined')
    window.frontbook.elements = {}

  if (typeof window.frontbook.react === 'undefined')
    window.frontbook.react = ({
      name,
      props,
      useEffect
    }: {
      name: string
      props?: Record<string, any>
      useEffect?: (component: HTMLElement) => (() => unknown) | undefined
    }) => {
      const originName = name.split('-').slice(0, -1).join('-')
      if (typeof window.frontbook.elements[originName] === 'undefined')
        return false

      const BasicElement = window.frontbook.elements[
        originName
      ] as typeof HTMLElement

      class ExtendedElement extends BasicElement {
        __frontbook__cleanUp?: () => unknown

        constructor() {
          super()
          if (props) {
            Object.keys(props).map(
              (propName) => (this[propName] = props[propName])
            )
          }
        }
        async connectedCallback() {
          // @ts-ignore
          if (super.connectedCallback) super.connectedCallback()

          if (typeof window.frontbook.instances[name] === 'undefined')
            window.frontbook.instances[name] = []
          window.frontbook.instances[name].push(this)

          if (typeof useEffect === 'function')
            this.__frontbook__cleanUp = await useEffect(this)
        }
        async disconnectedCallback() {
          // @ts-ignore
          if (super.disconnectedCallback) super.disconnectedCallback()
          if (typeof this.__frontbook__cleanUp === 'function')
            await this.__frontbook__cleanUp()

          if (typeof window.frontbook.instances[name] !== 'undefined') {
            const index = window.frontbook.instances[name].indexOf(this)
            if (index !== -1) window.frontbook.instances[name].splice(index, 1)
          }
        }
      }

      window.customElements.define(name, ExtendedElement)
      return true
    }

  if (typeof window.frontbook.update === 'undefined') {
    window.frontbook.update = async (
      name: string,
      updater: UpdaterType,
      props?: { immediately: boolean }
    ) => {
      const update = async () => {
        if (
          window.frontbook === undefined ||
          window.frontbook.instances === undefined ||
          typeof window.frontbook.instances[name] === 'undefined'
        )
          return
        const components = window.frontbook.instances[name]
        if (!Array.isArray(components) || components.length === 0) return
        for (const component of components) await updater(component)
      }

      if (props?.immediately) {
        await update()
      } else {
        setTimeout(update, 0)
      }
    }
  }

  if (typeof window.frontbook.registerComponent === 'undefined')
    window.frontbook.registerComponent = registerComponent
}
