# Mysql2 Adapter

This is a [`next-auth`](https://next-auth.js.org) adapter for projects that use
[mysql2](https://www.npmjs.com/package/mysql2) to connect to MySQL databases.

## Usage

```typescript title="pages/api/auth/[...nextauth].ts"
import NextAuth from "next-auth"
import { Mysql2Adapter } from "@next-auth/mysql2-adapter"

// provide a connectionPromise from "mysql2/promise" via mysql.createConnection or mysql.createPool

export default NextAuth({
  adapter: Mysql2Adapter(connectionPromise),
  providers: [],
})
```

### Extended user model

If your `User` table has additional fields to the default fields (`name`, `email`, `email_verified`, `image`), you
need to configure a mapping for the adapter like in the following example:

```typescript
const adapterConfig = {
  extendUserModel: {
    phone: "phone", // additional property "phone" which is also named "phone" in the User database table
    postalCode: "postal_code", // additional property "postalCode" which is named "postal_code" in the User database table
  },
}

export default NextAuth({
  adapter: Mysql2Adapter(connectionPromise, adapterConfig),
  providers: [],
})
```

## MySQL model

⚠️ The adapter expects your database follows the model defined by NextAuth.js at
[https://next-auth.js.org/adapters/models](https://next-auth.js.org/adapters/models).
You might want to use `./tests/seed.sql` to seed your MySQL database with the correct table structure including
a correct _Index_ and _Foreign Key_ structure. The file only contains the table structure and no data.

If you create the table structure manually, please pay attention to:

- Use the namings as described in [https://next-auth.js.org/adapters/models](https://next-auth.js.org/adapters/models)
- For `timestamptz` use the `DATETIME(6)` type
- Create a _Foreign Key_ relations as described in the model, with a `ON DELETE CASCADE` attribute
- Don't add additional fields to the `User` table that conflict with names from the other tables
