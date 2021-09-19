import { DataTypes } from "sequelize"

export const accountSchema = {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  type: { type: DataTypes.STRING, allowNull: false },
  provider: { type: DataTypes.STRING, allowNull: false },
  providerAccountId: { type: DataTypes.STRING, allowNull: false },
  refresh_token: { type: DataTypes.STRING },
  access_token: { type: DataTypes.STRING },
  expires_at: { type: DataTypes.INTEGER },
  token_type: { type: DataTypes.STRING },
  scope: { type: DataTypes.STRING },
  id_token: { type: DataTypes.STRING },
  oauth_token_secret: { type: DataTypes.STRING },
  oauth_token: { type: DataTypes.STRING },
  session_state: { type: DataTypes.STRING },
  userId: { type: DataTypes.INTEGER },
}

export const userSchema = {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING, unique: true },
  emailVerified: { type: DataTypes.DATE },
  image: { type: DataTypes.STRING },
}

export const sessionSchema = {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  expires: { type: DataTypes.DATE, allowNull: false },
  sessionToken: { type: DataTypes.STRING, unique: true, allowNull: false },
  userId: { type: DataTypes.INTEGER },
}

export const verificationTokenSchema = {
  token: { type: DataTypes.STRING, primaryKey: true },
  identifier: { type: DataTypes.STRING, allowNull: false },
  expires: { type: DataTypes.DATE, allowNull: false },
}
