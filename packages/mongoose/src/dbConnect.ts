import type { Connection } from "mongoose"
import { createConnection } from "mongoose"

let conn: Connection

export default function dbConnect(uri: string) {
  if (conn) {
    return conn
  }

  conn = createConnection(uri)
  return conn
}
