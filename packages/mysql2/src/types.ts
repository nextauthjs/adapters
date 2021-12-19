import type {
  Connection as ConnectionPromise,
  Pool as PoolPromise,
} from "mysql2/promise"

export type ConnectionType = Promise<ConnectionPromise> | Promise<PoolPromise>

interface ModelExtensionOptions {
  dbField: string
}
export interface ModelExtension {
  [key: string]: string | ModelExtensionOptions
}

export interface AdapterOptions {
  extendUserModel?: ModelExtension
}
