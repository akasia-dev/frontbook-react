import type ReactNamespace from 'react'
const reactComponentSymbol = Symbol.for('r2wc.reactComponent')
const renderSymbol = Symbol.for('r2wc.reactRender')
const shouldRenderSymbol = Symbol.for('r2wc.shouldRender')

/**
 * Converts a React component into a webcomponent
 * by wrapping it in a Proxy object.
 * @param {ReactComponent}
 * @param {React}
 * @param {ReactDOM}
 * @param {Object} options - Optional parameters
 * @param {String?} options.shadow - Use shadow DOM rather than light DOM.
 */
export const ReactWebComponent = (
  ReactComponent,
  React,
  ReactDOM,
  options: { shadow?: boolean } = {}
) => {
  const renderAddedProperties = {
    isConnected: 'isConnected' in HTMLElement.prototype
  }
  let rendering = false
  // Create the web component "class"

  function WebComponent(this: HTMLElement) {
    const self = Reflect.construct(HTMLElement, arguments, this.constructor)
    if (options.shadow) self.attachShadow({ mode: 'open' })
    return self
  }

  // Make the class extend HTMLElement
  const targetPrototype = Object.create(HTMLElement.prototype)
  targetPrototype.constructor = WebComponent

  // But have that prototype be wrapped in a proxy.
  const proxyPrototype = new Proxy(targetPrototype, {
    has: (target, key) => {
      return key in ReactComponent.propTypes || key in targetPrototype
    },

    // when any undefined property is set, create a getter/setter that re-renders
    set: (target, key, value, receiver) => {
      if (rendering) {
        renderAddedProperties[key] = true
      }

      if (
        typeof key === 'symbol' ||
        renderAddedProperties[key] ||
        key in target
      ) {
        return Reflect.set(target, key, value, receiver)
      } else {
        expand(receiver, key, value)
      }
      return true
    },

    // makes sure the property looks writable
    getOwnPropertyDescriptor: function (target, key) {
      const own = Reflect.getOwnPropertyDescriptor(target, key)
      if (own) {
        return own
      }
      if (key in ReactComponent.propTypes) {
        return {
          configurable: true,
          enumerable: true,
          writable: true,
          value: undefined
        }
      }
      return
    }
  })
  WebComponent.prototype = proxyPrototype

  // Setup lifecycle methods
  targetPrototype.connectedCallback = function () {
    // Re-rendering when children node is updated.
    let shouldRender = false
    if (typeof window['MutationObserver'] !== 'undefined') {
      new MutationObserver((_, element) => {
        this[shouldRenderSymbol] = true
        this[renderSymbol](false)
        shouldRender = false
      }).observe(this, { childList: true, attributes: true })
    }

    // Once connected, it will keep updating the innerHTML.
    // We could add a render method to allow this as well.
    this[shouldRenderSymbol] = true
    this[renderSymbol](true)
  }

  targetPrototype.disconnectedCallback = () => {
    // * Once disconnected, unmount the component.
    ReactDOM.unmountComponentAtNode(this)
  }

  targetPrototype[renderSymbol] = function (isConnectInit = false) {
    if (this[shouldRenderSymbol] === true) {
      const data = {}
      if (ReactComponent.propTypes) {
        const propTypes = Object.keys(ReactComponent.propTypes) ?? []
        Object.keys(this).forEach((key) => {
          if (propTypes.includes(key) && renderAddedProperties[key] !== false)
            data[key] = this[key]
        }, this)
      }
      rendering = true
      Array.from(this.attributes as NamedNodeMap).forEach((attr) => {
        if (attr) data[attr.name] = attr.nodeValue
      })

      setTimeout(() => {
        let children
        if (isConnectInit) {
          children = flattenIfOne(convertToReactChildren(React, this))
          this.__frontbook__children = children
        } else {
          children = this.__frontbook__children
        }

        // * Container is either shadow DOM or light DOM depending on `shadow` option.
        const container = options.shadow ? this.shadowRoot : this

        // * Use react to render element in container
        this[reactComponentSymbol] = ReactDOM.render(
          (children && !Array.isArray(children)) || children.length !== 0
            ? React.createElement(ReactComponent, data, children)
            : React.createElement(ReactComponent, data),
          container
        )

        rendering = false
      }, 0)
    }
  }

  // Handle attributes changing
  if (ReactComponent.propTypes) {
    WebComponent.observedAttributes = Object.keys(ReactComponent.propTypes)
    targetPrototype.attributeChangedCallback = function (
      name: string,
      _oldValue: unknown,
      newValue: unknown
    ) {
      this[name] = newValue
    }
  }

  return WebComponent
}

/**
 * Creates a getter/setter that re-renders
 * everytime a property is set.
 */
export const expand = (
  receiver: Record<string | number | symbol, () => unknown>,
  key: string,
  value: unknown
) => {
  Object.defineProperty(receiver, key, {
    enumerable: true,
    get: () => value,
    set: function (newValue) {
      value = newValue
      this[renderSymbol]()
    }
  })
  receiver[renderSymbol]()
}

/**
 * Check if all letters are capital letters.
 */
export const isAllCaps = (word: string) =>
  word.split('').every((c) => c.toUpperCase() === c)

/**
 * If there's only one element in the array,
 * make sure that it's not the array.
 */
export const flattenIfOne = (arr: unknown) => {
  if (!Array.isArray(arr)) return arr
  if (arr.length === 1) return arr[0]
  return arr
}

/**
 * Convert NamedNodeMap to an object.
 * It is used when the properties of
 * pure elements are used to create react components.
 */
export const convertNamedNodeMapToObject = (namedNodeMap: NamedNodeMap) => {
  const object: Record<string, string> = {}
  if (!namedNodeMap) return {}
  Array.from(namedNodeMap).map(({ name, value }) => (object[name] = value))
  return object
}

/**
 * Convert child elements into react elements.
 */
export const convertToReactChildren = (
  React: typeof ReactNamespace,
  node: HTMLElement
) => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.toString()
  if (node.nodeType === Node.COMMENT_NODE) return ''

  return flattenIfOne(
    Array.from(node.childNodes).map((c) => {
      if (c.nodeType === Node.TEXT_NODE) return c.textContent?.toString()
      if (c.nodeType === Node.COMMENT_NODE) return ''

      const nodeName = isAllCaps(c.nodeName)
        ? c.nodeName.toLowerCase()
        : c.nodeName

      const children = flattenIfOne(
        convertToReactChildren(React, c as HTMLElement)
      )

      return React.createElement(
        nodeName,
        convertNamedNodeMapToObject((c as HTMLElement).attributes),
        children
      )
    })
  )
}

export default ReactWebComponent
