import type { Config } from '@jest/types';

/**
 * Configure the jest testing framework
 */
// tslint:disable-next-line: no-default-export
export default async (): Promise<Config.InitialOptions> => {
    return {
        cacheDirectory: './.jestCache',
        preset: 'ts-jest',
        setupFilesAfterEnv: ['./test/configureTestEnv.ts'],
        testEnvironment: 'node',
        testPathIgnorePatterns: [
            '/node_modules/',
            '__build__',
            'test/utils/rfq_blockchain_utils_test.ts',
            'test/rfq_blockchain_utils_test.ts',
        ],
        testRegex: ['test\\/.*(_test|Test|.test)\\.ts$', '.*/__tests__/.*\\.?(Test|test)\\.[tj]sx?$'],
        verbose: false,
    };
};
