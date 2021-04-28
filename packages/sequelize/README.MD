# Sequelize Adapter For Next-Auth

[![GitHub issues](https://img.shields.io/github/issues/EXIT-ALAMERY/next-auth-sequelize-adapter)](https://github.com/EXIT-ALAMERY/next-auth-sequelize-adapter/issues) [![GitHub forks](https://img.shields.io/github/forks/EXIT-ALAMERY/next-auth-sequelize-adapter)](https://github.com/EXIT-ALAMERY/next-auth-sequelize-adapter/network) [![GitHub stars](https://img.shields.io/github/stars/EXIT-ALAMERY/next-auth-sequelize-adapter)](https://github.com/EXIT-ALAMERY/next-auth-sequelize-adapter/stargazers)

## Getting Started

To get started, either clone the example or use `$ npx create-next-app my-app` with the [sequelize-cli's](https://www.npmjs.com/package/sequelize-cli) `$ sequelize init` command and generate all the necessary files.

### Prerequisites

You must install sequelize in your Next-JS/Next-Auth project to use this adapter. Learn More about using custom adapters with Next-Auth [here](https://next-auth.js.org/schemas/adapters).

### Installation

Install the package using npm:

`$ npm install next-auth-sequelize-adapter --save`

If you are using yarn, then type:

`$ yarn add next-auth-sequelize-adapter`

### Usage

Now cd into the db folder, open the **models/index.js** and replace all code with:

#### models/index.js

```javascript
import Sequelize, { Model } from "sequelize";
import {
  userModel,
  accountModel,
  sessionModel,
  verificationRequestModel,
} from "next-auth-sequelize-adapter";

const path = require("path");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];
const db = {};

let sequelize;

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.User = userModel(Model, sequelize, Sequelize);
db.Account = accountModel(Model, sequelize, Sequelize);
db.Session = sessionModel(Model, sequelize, Sequelize);
db.VerificationRequest = verificationRequestModel(Model, sequelize, Sequelize);

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export default db;
```

Then edit the **pages/api/auth/[...nextauth].js** and specify that NextAuth should now use the sequelize adapter.

#### pages/api/auth/[...nextauth].js

```javascript
import NextAuth from "next-auth";
import Providers from "next-auth/providers";

// import the local db object and the SequelizeAdapter
import db from "../../../db/models";
import { SequelizeAdapter } from "next-auth-sequelize-adapter";

const options = {
  // specify all the OAuth providers here
  providers: [
    Providers.GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],

  // specify the database connection string
  database: process.env.DATABASE_CONNECTION_STRING,

  // specify the sequelize adapter and pass the db instance as models
  adapter: SequelizeAdapter.Adapter({ models: db }),
};

export default (req, res) => NextAuth(req, res, options);
```

Now, these were the minimum requirements to get next-auth working with sequelize ORM, but you might want to extend the default models such as the user model with a **phone number** field or add a relationship to another model such as **posts**.

### Extending Default Models

To extend a default model, first, generate a new model either manually or with sequelize-cli, then import the relevant schema and spread it inside the init method of your newly generated model. Now you can specify any custom properties such as a **phone number**.

#### models/user_extended.js

```javascript
// import the schema for the model you want to extend
import { userSchema } from "next-auth-sequelize-adapter";

const extendedUserModel = (Model, sequelize, Sequelize) => {
  class User extends Model {
    static associate(models) {
      // define association here
    }
  }
  User.init(
    {
      // spread the schema to get all the default properties
      ...userSchema(Sequelize),

      // define any custom properties you want to extend the model with
      phoneNumber: {
        type: Sequelize.STRING,
        unique: true,
        field: "phone_number",
      },
    },
    {
      sequelize,
      tableName: "users",
      modelName: "User",
    }
  );

  return User;
};

export default extendedUserModel;
```

Then edit the **models/index.js** and tell sequelize to use the custom model and not the default model:

#### models/index.js

```javascript
import Sequelize, { Model } from "sequelize";
import {
  userModel,
  accountModel,
  sessionModel,
  verificationRequestModel,
} from "next-auth-sequelize-adapter";

// import your extended model
import userModelExtended from "./user_extended";

const path = require("path");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];
const db = {};

let sequelize;

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Comment out or remove the default model
// db.User = userModel(Model, sequelize, Sequelize);

// Initialize the extended model and use it in your project
db.User = userModelExtended(Model, sequelize, Sequelize);
db.Account = accountModel(Model, sequelize, Sequelize);
db.Session = sessionModel(Model, sequelize, Sequelize);
db.VerificationRequest = verificationRequestModel(Model, sequelize, Sequelize);

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export default db;
```

### Creating New Models

Creating models other than the default next-auth models is very simple. Just generate the new model and its migration using the sequelize-cli and include it in the **models/index.js** file using the ES6 import syntax.

### Extending The Session Object

To extend the session object and include custom properties like the **phone number** of a user, check out the next-auth documentation [here](https://next-auth.js.org/configuration/callbacks#session-callback)

## Contributing

Contributions make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
