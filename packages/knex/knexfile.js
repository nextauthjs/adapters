module.exports = {
  development: {
    client: "sqlite3",
    useNullAsDefault: true,
    connection: {
      filename: "./tests/dev.sqlite3",
    },
    migrations: {
      tableName: "knex_migrations",
    },
  },
}
