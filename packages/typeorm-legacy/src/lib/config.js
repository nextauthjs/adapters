import { EntitySchema } from "typeorm"

export function parseConnectionString(configOrString) {
  if (typeof configOrString !== "string") {
    return configOrString
  }

  // If the input is URL string, automatically convert the string to an object
  // to make configuration easier (in most use cases).
  //
  // TypeORM accepts connection string as a 'url' option, but unfortunately
  // not for all databases (e.g. SQLite) or for all options, so we handle
  // parsing it in this function.
  try {
    const parsedUrl = new URL(configOrString)
    const config = {}

    if (parsedUrl.protocol.startsWith("mongodb+srv")) {
      // Special case handling is required for mongodb+srv with TypeORM
      config.type = "mongodb"
      config.url = configOrString.replace(/\?(.*)$/, "")
      config.useNewUrlParser = true
    } else {
      config.type = parsedUrl.protocol.replace(/:$/, "")
      config.host = parsedUrl.hostname
      config.port = Number(parsedUrl.port)
      config.username = parsedUrl.username
      config.password = parsedUrl.password
      config.database = parsedUrl.pathname
        .replace(/^\//, "")
        .replace(/\?(.*)$/, "")
      config.options = {}
    }

    // This option is recommended by mongodb
    if (config.type === "mongodb") {
      config.useUnifiedTopology = true
    }

    // Prevents warning about deprecated option (sets default value)
    if (config.type === "mssql") {
      config.options.enableArithAbort = true
    }

    if (parsedUrl.search) {
      parsedUrl.search
        .replace(/^\?/, "")
        .split("&")
        .forEach((keyValuePair) => {
          let [key, value] = keyValuePair.split("=")
          // Converts true/false strings to actual boolean values
          if (value === "true") {
            value = true
          }
          if (value === "false") {
            value = false
          }
          config[key] = value
        })
    }

    return config
  } catch (error) {
    // If URL parsing fails for any reason, try letting TypeORM handle it
    return {
      url: configOrString,
    }
  }
}

export function loadConfig(config, { models, namingStrategy }) {
  const defaultConfig = {
    name: "nextauth",
    autoLoadEntities: true,
    entities: [
      new EntitySchema(models.User.schema),
      new EntitySchema(models.Account.schema),
      new EntitySchema(models.Session.schema),
      new EntitySchema(models.VerificationRequest.schema),
    ],
    timezone: "Z",
    logging: false,
    namingStrategy,
  }

  return {
    ...defaultConfig,
    ...config,
  }
}
