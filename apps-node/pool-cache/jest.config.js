/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testRegex: '\\.test\\.ts$',
    modulePathIgnorePatterns: ['<rootDir>/lib/'],
};
