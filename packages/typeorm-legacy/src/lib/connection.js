import { createConnection, getConnection } from "typeorm"
import { updateConnectionEntities } from "./utils"

export async function handleConnection({ connection, config, logger }) {
  let _connection
  // Helper function to reuse / re-establish connections
  // (useful if they drop when after being idle)
  async function _connect() {
    // Get current connection by name
    _connection = getConnection(config.name)

    // If connection is no longer established, reconnect
    if (!connection.isConnected) {
      _connection = await connection.connect()
    }
  }

  if (!connection) {
    // If no connection, create new connection
    try {
      _connection = await createConnection(config)
    } catch (error) {
      if (error.name === "AlreadyHasActiveConnectionError") {
        // If creating connection fails because it's already
        // been re-established, check it's really up
        await _connect()
      } else {
        logger.error("ADAPTER_CONNECTION_ERROR", error)
      }
    }
  } else {
    // If the connection object already exists, ensure it's valid
    await _connect()
  }

  if (process.env.NODE_ENV !== "production") {
    await updateConnectionEntities(connection, config.entities)
  }

  return _connection
}
