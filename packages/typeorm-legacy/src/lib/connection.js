import { createConnection, getConnection } from "typeorm"
import { updateConnectionEntities } from "./utils"

/**
 * Makes sure there always is an active connection
 * @param {null | import("typeorm").Connection} connection
 * @param {any} config
 * @returns
 */
export async function handleConnection(connection, config) {
  // Helper function to reuse / re-establish connections
  // (useful if they drop when after being idle)
  async function connect() {
    // Get current connection by name
    connection = getConnection(config.name)

    // If connection is no longer established, reconnect
    if (!connection.isConnected) {
      connection = await connection.connect()
    }
  }

  if (!connection) {
    // If no connection, create new connection
    try {
      connection = await createConnection(config)
    } catch (error) {
      if (error.name === "AlreadyHasActiveConnectionError") {
        // If creating connection fails because it's already
        // been re-established, check if it's really up
        await connect()
      } else {
        throw error
      }
    }
  } else {
    // If the connection object already exists, ensure it's valid
    await connect()
  }

  if (process.env.NODE_ENV !== "production") {
    await updateConnectionEntities(connection, config.entities)
  }
}
