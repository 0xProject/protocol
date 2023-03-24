module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testRegex: '\\.integration\\.ts$',
    modulePathIgnorePatterns: ['<rootDir>/lib/'],
};
