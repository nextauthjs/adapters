module.exports = {
  development: {
    client: "sqlite3",
    connection: {
      filename: "./tests/dev.sqlite3",
    },
    migrations: {
      tableName: "knex_migrations",
    },
  },
}
