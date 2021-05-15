module.exports = {
  preset: "ts-jest",
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
  testEnvironment: "node",
  modulePathIgnorePatterns: ["dist/", "node_modules/"],
}
