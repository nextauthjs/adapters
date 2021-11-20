import type { Session, QueryResult } from "neo4j-driver"
import { isInt, integer } from "neo4j-driver"

// https://github.com/honeinc/is-iso-date/blob/master/index.js
const isoDateRE =
  /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/

function isDate(value: any) {
  return value && isoDateRE.test(value) && !isNaN(Date.parse(value))
}

export const format = {
  /** Takes a plain old JavaScript object and turns it into a Neo4j compatible object */
  to(object: Record<string, any>) {
    const newObject: Record<string, unknown> = {}
    for (const key in object) {
      const value = object[key]
      if (value instanceof Date) newObject[key] = value.toISOString()
      else newObject[key] = value
    }
    return newObject
  },
  /** Takes a Neo4j object and returns a plain old JavaScript object */
  from<T = Record<string, unknown>>(object?: Record<string, any>): T | null {
    const newObject: Record<string, unknown> = {}
    if (!object) return null
    for (const key in object) {
      const value = object[key]
      if (isDate(value)) {
        newObject[key] = new Date(value)
      } else if (isInt(value)) {
        if (integer.inSafeRange(value)) newObject[key] = value.toNumber()
        else newObject[key] = value.toString()
      } else {
        newObject[key] = value
      }
    }

    return newObject as T
  },
}

export function client(session: Session) {
  return async function query(
    statement: string,
    values?: any,
    options?: any
  ): Promise<any> {
    let result: QueryResult

    // Database read or write transaction.
    if (options?.tx === "read") {
      result = await session.readTransaction((tx) => tx.run(statement, values))
    } else {
      result = await session.writeTransaction((tx) =>
        tx.run(statement, format.to(values))
      )
    }

    // Following are different ways to return the data.
    // 1️⃣ Return the single value or object from the database response.
    if (!options?.returnFormat) {
      return format.from(result?.records[0]?.get(0)) || null
    }

    // 2️⃣ Return multiple values or objects from the database response.
    if (Array.isArray(options?.returnFormat)) {
      const returnObject: any = {}

      options?.returnFormat.forEach((returnKey: string) => {
        returnObject[returnKey] =
          format.from(result?.records[0]?.get(returnKey)) || null
      })

      return returnObject
    }

    // 3️⃣ Return the database data without any transforms.
    if (options?.returnFormat === "raw") {
      return result
    }

    return null
  }
}
