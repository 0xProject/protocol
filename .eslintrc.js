module.exports = {
    root: true,
    ignorePatterns: ['node_modules/**/*', 'lib/**/*'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'eslint-plugin-jest'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
    ],
    rules: {
        "jest/no-focused-tests": "error",
    }
};
