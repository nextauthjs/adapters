"use strict";

module.exports = {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable("verificationrequests", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      identitifer: {
        type: DataTypes.STRING,
      },
      token: {
        type: DataTypes.STRING,
        unique: true,
      },
      expires: {
        type: DataTypes.DATE,
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
    await queryInterface.dropTable("verificationrequests");
  },
};
