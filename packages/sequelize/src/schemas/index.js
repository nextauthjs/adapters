"use strict";

export const accountSchema = (DataTypes) => ({
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
    type: DataTypes.DATE,
    field: "created_at",
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: "updated_at",
  },
});

export const sessionSchema = (DataTypes) => ({
  userId: {
    type: DataTypes.INTEGER,
    field: "user_id",
  },
  expires: {
    type: DataTypes.DATE,
  },
  sessionToken: {
    type: DataTypes.STRING,
    field: "session_token",
    unique: true,
  },
  accessToken: {
    type: DataTypes.STRING,
    field: "access_token",
    unique: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    field: "created_at",
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: "updated_at",
  },
});

export const userSchema = (DataTypes) => ({
  name: DataTypes.STRING,
  email: {
    type: DataTypes.STRING,
    unique: true,
  },
  emailVerified: {
    type: DataTypes.DATE,
    field: "email_verified",
  },
  image: DataTypes.STRING,
  createdAt: {
    type: DataTypes.DATE,
    field: "created_at",
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: "updated_at",
  },
});

export const verificationRequestSchema = (DataTypes) => ({
  identitifer: DataTypes.STRING,
  token: {
    type: DataTypes.STRING,
    unique: true,
  },
  expires: DataTypes.DATE,
  createdAt: {
    type: DataTypes.DATE,
    field: "created_at",
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: "updated_at",
  },
});
