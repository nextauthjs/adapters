import type { ModelExtension } from "../types"

/**
 * Generated SQL statements that extends the SELECT part for the given extended
 * model.
 *
 * @param ext Model extension (optional)
 */
export const extendSelectQuery = (ext: ModelExtension): string[] => {
  const queryParts = []
  for (const [key, cfg] of Object.entries(ext)) {
    const dbField = typeof cfg === "string" ? cfg : cfg.dbField
    queryParts.push(`${dbField} AS ${key}`)
  }
  return queryParts
}

/**
 * Generates SQL statements for the SET part for the given data and extension
 * model. Mysql2 named parameters are used in the statement like `db_property = :dbProperty`
 *
 * @param data Data (the complete data including default and extension!)
 * @param ext Model extension (optional)
 * @param defaultMapping Mapping that applies to the default data model (optional)
 */
export const generateSetQuery = (
  data: Record<string, any>,
  ext: ModelExtension,
  defaultMapping: Record<string, string> = { emailVerified: "email_verified" }
): string[] => {
  const setParts = []
  for (const key of Object.keys(data)) {
    // is extended model data?
    if (ext[key]) {
      const extSetting = ext[key]
      const dbField =
        typeof extSetting === "string" ? extSetting : extSetting.dbField
      setParts.push(`${dbField} = :${key}`)
      // default user data
    } else {
      const dbField = defaultMapping[key] ? defaultMapping[key] : key
      setParts.push(`${dbField} = :${key}`)
    }
  }
  return setParts
}

/**
 * Generates SQL statements that extend the INSERT and VALUES part for the given extended
 * model. Mysql2 named parameters are used in the statement like `db_property = :dbProperty`
 *
 * @param data
 * @param ext Model extension (optional)
 */
export const extendInsertValuesQuery = (
  data: { [key: string]: any },
  ext: ModelExtension
): { insert: string[]; values: string[] } => {
  const insertParts = []
  const valuesParts = []
  for (const key of Object.keys(data)) {
    // is extended model data?
    if (ext[key]) {
      const extSetting = ext[key]
      const dbField =
        typeof extSetting === "string" ? extSetting : extSetting.dbField
      insertParts.push(`${dbField}`)
      valuesParts.push(`:${key}`)
    }
  }
  return { insert: insertParts, values: valuesParts }
}
