import type ReactNamespace from 'react'
const reactComponentSymbol = Symbol.for('r2wc.reactComponent')
const renderSymbol = Symbol.for('r2wc.reactRender')
const shouldRenderSymbol = Symbol.for('r2wc.shouldRender')

/**
 * Creates a getter/setter that re-renders
 * everytime a property is set.
 */
const expando = (receiver, key, value) => {
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
const isAllCaps = (word: string) =>
  word.split('').every((c) => c.toUpperCase() === c)

const flattenIfOne = (arr) => {
  if (!Array.isArray(arr)) return arr
  if (arr.length === 1) return arr[0]
  return arr
}

const convertNamedNodeMapToObject = (namedNodeMap: NamedNodeMap) => {
  const object = {}
  Array.from(namedNodeMap).map(({ name, value }) => (object[name] = value))
  return object
}

const mapChildren = (React: typeof ReactNamespace, node: HTMLElement) => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.toString()
  }

  return flattenIfOne(
    Array.from(node.childNodes).map((c: HTMLElement) => {
      if (c.nodeType === Node.TEXT_NODE) {
        return c.textContent?.toString()
      }
      // BR = br, ReactElement = ReactElement
      const nodeName = isAllCaps(c.nodeName)
        ? c.nodeName.toLowerCase()
        : c.nodeName
      const children = flattenIfOne(mapChildren(React, c))
      return React.createElement(
        nodeName,
        convertNamedNodeMapToObject(c.attributes),
        children
      )
    })
  )
}

/**
 * Converts a React component into a webcomponent
 * by wrapping it in a Proxy object.
 * @param {ReactComponent}
 * @param {React}
 * @param {ReactDOM}
 * @param {Object} options - Optional parameters
 * @param {String?} options.shadow - Use shadow DOM rather than light DOM.
 */
const ReactWebComponent = (
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

  /**
   * @constructor
   * @this HTMLElement
   */
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
        expando(receiver, key, value)
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
    // Once connected, it will keep updating the innerHTML.
    // We could add a render method to allow this as well.
    this[shouldRenderSymbol] = true
    this[renderSymbol]()
  }

  targetPrototype.disconnectedCallback = () => {
    // * Once disconnected, unmount the component.
    ReactDOM.unmountComponentAtNode(this)
  }

  targetPrototype[renderSymbol] = function () {
    if (this[shouldRenderSymbol] === true) {
      const data = {}
      Object.keys(this).forEach((key) => {
        if (renderAddedProperties[key] !== false) data[key] = this[key]
      }, this)
      rendering = true
      Array.from(this.attributes).forEach(
        (attr: typeof HTMLElement & HTMLElement) => {
          if (attr) data[attr.name] = attr.nodeValue
        }
      )

      setTimeout(() => {
        const children = flattenIfOne(mapChildren(React, this))

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

export default ReactWebComponent
