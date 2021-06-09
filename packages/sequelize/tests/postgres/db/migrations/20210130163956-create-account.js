"use strict";

module.exports = {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable("accounts", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      compoundId: {
        type: DataTypes.STRING,
        field: "compound_id",
        unique: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        field: "user_id",
      },
      providerType: {
        type: DataTypes.STRING,
        field: "provider_type",
      },
      providerId: {
        type: DataTypes.STRING,
        field: "provider_id",
      },
      providerAccountId: {
        type: DataTypes.STRING,
        field: "provider_account_id",
      },
      refreshToken: {
        type: DataTypes.STRING,
        field: "refresh_token",
      },
      accessToken: {
        type: DataTypes.STRING,
        field: "access_token",
      },
      accessTokenExpires: {
        type: DataTypes.DATE,
        field: "access_token_expires",
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: "created_at",
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: "updated_at",
      },
    });
  },
  down: async (queryInterface, DataTypes) => {
    await queryInterface.dropTable("accounts");
  },
};
