module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["dotenv/config"],
  testRegex: "\\.test\\.ts$",
  testPathIgnorePatterns: ["/mocks/", "/utils/"],
};
