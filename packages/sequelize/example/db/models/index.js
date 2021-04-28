'use strict';

import Sequelize, { Model } from 'sequelize';
import { 
  userModel, accountModel, sessionModel, verificationRequestModel 
} from 'next-auth-sequelize-adapter/models';

const path = require('path');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.User = userModel(Model, sequelize, Sequelize);
db.Account = accountModel(Model, sequelize, Sequelize);
db.Session = sessionModel(Model, sequelize, Sequelize);
db.VerificationRequest = verificationRequestModel(Model, sequelize, Sequelize);

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  };
});

export default db;
