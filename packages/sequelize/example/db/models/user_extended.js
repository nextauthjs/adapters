"use strict";

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

      // define any custom properties you want the model to be extended with
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
