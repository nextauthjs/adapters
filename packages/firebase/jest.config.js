const jestConfig = require("../../jest.config")

module.exports = {
  ...jestConfig,
  resolver: "jest-node-exports-resolver",
}
