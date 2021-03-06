export interface IContiDemoProps {
  controls?: {
    [propName: string]: IContiComponentProps
  }
  renderProps?: (props: IContiStoreComponentValue) => Record<string, any>
  renderManualComponent?: (...props) => JSX.Element
  children?: string
  documentUrl?: string
  /**
   * Maximum size is 12.
   * The default value is 6.
   */
  w?: number
  /**
   * The default value is 6.
   */
  h?: number
}

export interface IContiComponent {
  name?: string
  component?: (...props) => JSX.Element
  controls?: {
    [propName: string]: IContiComponentProps
  }
  renderProps?: (props: IContiStoreComponentValue) => Record<string, any>
  children?: string
  documentUrl?: string
  w?: number
  h?: number
}

export type ContiComponentPropType = 'string' | 'number' | 'boolean' | 'select'
export type ContiComponentPropValue<T> = T extends 'string'
  ? string
  : T extends 'number'
  ? number
  : T extends 'boolean'
  ? boolean
  : T extends 'select'
  ? ContiComponentPropSelectValue
  : never
export type ContiComponentPropSelectValue = {
  selectableValues: string[]
  defaultValue: string
}

export interface IContiComponentProps<T = ContiComponentPropType> {
  type: T
  defaultValue?: ContiComponentPropValue<T>
}

export type IContiStoreComponentValue = {
  [propName: string]: string | number | boolean
}

export type IContiStoreComponentType = {
  [propName: string]: IContiComponentProps<ContiComponentPropType>
}

export interface IContiStoreComponentProps {
  [componentName: string]: IContiStoreComponentValue
}

export interface IContiStoreComponentPropTypes {
  [componentName: string]: IContiStoreComponentType
}
