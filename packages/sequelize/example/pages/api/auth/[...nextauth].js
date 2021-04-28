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
