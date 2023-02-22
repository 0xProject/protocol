module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testRegex: '\\.integration\\.ts$',
    testPathIgnorePatterns: ['/mocks/', '/utils/'],
};
