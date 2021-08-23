import neo4j from "neo4j-driver"

const neo4jToSafeNumber = (x: typeof neo4j.Integer) => {
  if (!neo4j.isInt(x)) {
    return x
  }
  if (neo4j.integer.inSafeRange(x)) {
    return x.toNumber()
  } else {
    return x.toString()
  }
}

// Function to transform date values from neo4j DateTime to JS Date object.
const neo4jDateToJs = (value: typeof neo4j.DateTime | null) => {
  if (!value || !neo4j.temporal.isDateTime(value)) {
    return value
  }
  return new Date(value.toString())
}

const neo4jWrap = async (
  session: typeof neo4j.Session,
  statement: string,
  values: any,
  options?: any
) => {
  let result: any

  const DATE_KEYS = ["emailVerified", "expires"]

  // Transform date values from JS Date object to ISO strings.
  DATE_KEYS.forEach((key: string) => {
    if (values?.[key] instanceof Date) {
      values[key] = values[key].toISOString()
    }
  })

  // Database read or write transaction.
  try {
    if (options?.tx === "read") {
      result = await session.readTransaction((tx) => tx.run(statement, values))
    } else {
      result = await session.writeTransaction((tx) => tx.run(statement, values))
    }
  } catch (error) {
    console.error(error)
    return null
  }

  // Function to loop over neo4j result and run transforms on date values.
  const withJsDates = (neo4jResult: any) => {
    DATE_KEYS.forEach((key: string) => {
      if (neo4jResult?.[key]) {
        neo4jResult[key] = neo4jDateToJs(neo4jResult[key])
      }
    })
    return neo4jResult
  }

  // Following are different ways to return the data.

  // 1️⃣ Return the single value or object from the database response.
  if (!options?.returnFormat) {
    return withJsDates(result?.records[0]?.get(0)) || null
  }

  // 2️⃣ Return multiple values or objects from the database response.
  if (Array.isArray(options?.returnFormat)) {
    const returnObject: any = {}

    options?.returnFormat.forEach((returnKey: string) => {
      returnObject[returnKey] =
        withJsDates(result?.records[0]?.get(returnKey)) || null
    })

    return returnObject
  }

  // 3️⃣ Return the database data without any transforms.
  if (options?.returnFormat === "raw") {
    return result
  }

  return null
}

export { neo4jToSafeNumber, neo4jDateToJs, neo4jWrap }
