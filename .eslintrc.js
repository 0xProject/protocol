module.exports = {
    root: true,
    ignorePatterns: ['node_modules/**/*', 'lib/**/*'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'eslint-plugin-jest', 'eslint-plugin-import'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
    ],
    rules: {
        "jest/no-focused-tests": "error",
        "import/no-cycle": "error",
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
    // Instructions from https://github.com/import-js/eslint-plugin-import and https://github.com/import-js/eslint-import-resolver-typescript#configuration
    "settings": {
        "import/parsers": {
          "@typescript-eslint/parser": [".ts"]
        },
        "import/resolver": {
          "typescript": {
            "alwaysTryTypes": true,
          }
        }
    }
};
