/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/en/configuration.html
 */
const { defaults: tsjPreset } = require("ts-jest/presets")

module.exports = {
  transform: {
    ...tsjPreset.transform,
  },
  testEnvironment: "node",
}
