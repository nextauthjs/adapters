module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePathIgnorePatterns: ["dist/", "node_modules/"],
  resolver: "jest-node-exports-resolver",
}
