exports.up = function (knex) {
  return knex.schema
    .createTable("users", function (table) {
      table.uuid("id").notNullable().primary()
      table.string("name")
      table.string("email").unique()
      table.timestamp("emailVerified")
      table.string("image")
    })
    .createTable("accounts", function (table) {
      table.uuid("id").notNullable().primary()
      table.string("userId").notNullable()
      table.string("type").notNullable()
      table.string("provider").notNullable()
      table.string("providerAccountId").notNullable()
      table.string("refresh_token")
      table.string("access_token")
      table.int("expires_at")
      table.string("token_type")
      table.string("scope")
      table.string("id_token")
      table.string("session_state")
      table.string("oauth_token_secret")
      table.string("oauth_token")
    })
    .createTable("sessions", function (table) {
      table.uuid("id").notNullable().primary()
      table.string("sessionToken").unique().notNullable()
      table.string("userId").notNullable()
      table.timestamp("expires").notNullable()
    })
    .createTable("verification_tokens", function (table) {
      table.string("identifier").notNullable()
      table.string("token").unique().notNullable()
      table.timestamp("expires").notNullable()
    })
}

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("users")
    .dropTableIfExists("accounts")
    .dropTableIfExists("sessions")
    .dropTableIfExists("verification_tokens")
}
