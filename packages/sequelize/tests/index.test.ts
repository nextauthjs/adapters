import { Sequelize } from "sequelize"
import { runBasicTests } from "../../../basic-tests"
import SequelizeAdapter from "../src"

const sequelize = new Sequelize({
  logging: false,
  dialect: "sqlite",
  storage: ":memory:",
})

runBasicTests({
  adapter: SequelizeAdapter(sequelize),
  db: {
    connect: async () => {
      return await sequelize.sync({ force: true })
    },
    verificationToken: async (where) => {
      const verificationToken =
        await sequelize.models.verificationToken.findOne({ where })

      return verificationToken?.get({ plain: true }) || null
    },
    user: async (id) => {
      const user = await sequelize.models.user.findByPk(id)

      return user?.get({ plain: true }) || null
    },
    account: async (where) => {
      const account = await sequelize.models.account.findOne({ where })

      return account?.get({ plain: true }) || null
    },
    session: async (sessionToken) => {
      const session = await sequelize.models.session.findOne({
        where: { sessionToken },
      })

      return session?.get({ plain: true }) || null
    },
  },
})
