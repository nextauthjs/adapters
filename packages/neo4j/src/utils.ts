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

const neo4jDateToJs = (value: typeof neo4j.DateTime | null) => {
  if (!value || !neo4j.temporal.isDateTime(value)) {
    return value
  }
  return new Date(value.toString())
}

export { neo4jToSafeNumber, neo4jDateToJs }
