import type {
  Connection as ConnectionPromise,
  Pool as PoolPromise,
} from "mysql2/promise"

/*
 * Adapter supports mysql2 Connection and Pool promise
 */
export type ConnectionType = Promise<ConnectionPromise> | Promise<PoolPromise>

/*
 * Interface to describe User Model extensions for this adapter
 */
interface ModelExtensionOptions {
  dbField: string
}
export interface ModelExtension {
  [key: string]: string | ModelExtensionOptions
}
export interface AdapterOptions {
  extendUserModel?: ModelExtension
}
