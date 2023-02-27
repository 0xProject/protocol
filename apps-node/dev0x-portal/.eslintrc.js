/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "@remix-run/eslint-config/jest-testing-library",
    "plugin:storybook/recommended",
  ],
  rules: {
    "testing-library/no-await-sync-events": [
      "warn",
      {
        eventModules: ["fire-event"],
      },
    ],
  },
  overrides: [
    {
      files: ["e2e/**/*+(spec).[jt]s?(x)"],
      rules: {
        "testing-library/prefer-screen-queries": "off",
      },
    },
  ],
};
