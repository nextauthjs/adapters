// import TypeORM from 'typeorm'
// const TypeORM = require('typeorm')
const TypeORMAdapter = require('typeorm-adapter').default

module.exports = {
  Default: new TypeORMAdapter().default
}
