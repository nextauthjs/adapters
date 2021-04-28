"use strict";
import {
  accountSchema,
  sessionSchema,
  userSchema,
  verificationRequestSchema,
} from "../schemas";

export const accountModel = (Model, sequelize, Sequelize) => {
  class Account extends Model {
    static associate(models) {
      // Define association here
    }
  }
  Account.init(accountSchema(Sequelize), {
    sequelize,
    tableName: "accounts",
    modelName: "Account",
    indexes: [
      {
        name: "providerAccountId",
        unique: true,
        fields: ["providerAccountId"],
      },
      {
        name: "providerId",
        unique: true,
        fields: ["providerId"],
      },
      {
        name: "userId",
        unique: true,
        fields: ["userId"],
      },
    ],
  });

  return Account;
};

export const sessionModel = (Model, sequelize, Sequelize) => {
  class Session extends Model {
    static associate({ userModel }) {
      // Define association here
    }
  }
  Session.init(sessionSchema(Sequelize), {
    sequelize,
    tableName: "sessions",
    modelName: "Session",
  });

  return Session;
};

export const userModel = (Model, sequelize, Sequelize) => {
  class User extends Model {
    static associate({ Account, Session }) {
      // Define association here
    }
  }
  User.init(userSchema(Sequelize), {
    sequelize,
    tableName: "users",
    modelName: "User",
  });

  return User;
};

export const verificationRequestModel = (Model, sequelize, Sequelize) => {
  class VerificationRequest extends Model {
    static associate(models) {
      // Define association here
    }
  }
  VerificationRequest.init(verificationRequestSchema(Sequelize), {
    sequelize,
    tableName: "verification_requests",
    modelName: "VerificationRequest",
  });

  return VerificationRequest;
};
