import neo4j from "neo4j-driver"

export const neo4jToSafeNumber = (x: typeof neo4j.Integer) => {
  if (!neo4j.isInt(x)) {
    return x
  }
  if (neo4j.integer.inSafeRange(x)) {
    return x.toNumber()
  } else {
    return x.toString()
  }
}

export const neo4jEpochToDate = (epoch: typeof neo4j.Integer) => {
  const epochParsed = neo4jToSafeNumber(epoch)

  if (typeof epochParsed !== "number") return null

  return new Date(epochParsed)
}
