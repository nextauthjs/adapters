import type { ModelExtension } from "../types"

/**
 * Generated SQL statements that extends the SELECT part for the given extended
 * model.
 *
 * @param ext
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
 * Generates SQL statements that extend the SET part for the given extended
 * model. Mysql2 named parameters are used in the statement like `db_property = :dbProperty`
 *
 * @param ext
 * @param data
 */
export const extendSetQuery = (
  ext: ModelExtension,
  data: { [key: string]: any }
): string[] => {
  const setParts = []
  for (const key of Object.keys(data)) {
    // is extended model data?
    if (ext[key]) {
      const extSetting = ext[key]
      const dbField =
        typeof extSetting === "string" ? extSetting : extSetting.dbField
      setParts.push(`${dbField} = :${key}`)
    }
  }
  return setParts
}

/**
 * Generates SQL statements that extend the INSERT and VALUES part for the given extended
 * model. Mysql2 named parameters are used in the statement like `db_property = :dbProperty`
 *
 * @param ext
 * @param data
 */
export const extendInsertValuesQuery = (
  ext: ModelExtension,
  data: { [key: string]: any }
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
