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
        testPathIgnorePatterns: ['/node_modules/', '__build__'],
        testRegex: ['test\\/.*(_test|Test|.test)\\.ts$', '.*/__tests__/.*\\.?(Test|test)\\.[tj]sx?$'],
        verbose: false,
    };
};
