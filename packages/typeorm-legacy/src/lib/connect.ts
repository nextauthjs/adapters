import requireOptional from "require_optional"
import { Connection, ConnectionOptions, createConnection } from "typeorm"
import { updateConnectionEntities } from "./utils"

export type ConnectParams = { connection?: Connection } & ConnectionOptions

export function connect(params: ConnectParams) {
  let { connection, ...config } = params

  return {
    /** `_id` for `mongodb`, `id` otherwise */
    idKey: config.name === "mongodb" ? ("_id" as const) : ("id" as const),
    /** In case of `mongodb`, it turns the id into an `ObjectId` */
    getId(id: string) {
      if (config.name === "mongodb") {
        const { ObjectId } = requireOptional("mongodb")
        return ObjectId(id)
      }
      return id
    },
    async client() {
      if (!connection) {
        connection = await createConnection(config)
      }

      if (!connection.isConnected) {
        connection = await connection.connect()
      }

      if (process.env.NODE_ENV !== "production") {
        await updateConnectionEntities(connection, config.entities)
      }

      return connection.manager
    },
  }
}
