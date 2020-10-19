import { expect } from '@0x/contracts-test-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import 'mocha';
import { Connection, Repository } from 'typeorm';

import { TransactionEntity } from '../src/entities';
import { TransactionStates } from '../src/types';
import { parseUtils } from '../src/utils/parse_utils';
import {
    DatabaseKeysUsedForRateLimiter,
    MetaTransactionDailyLimiter,
    MetaTransactionRateLimiter,
    MetaTransactionRollingLimiter,
    RollingLimiterIntervalUnit,
} from '../src/utils/rate-limiters';
import { MetaTransactionComposableLimiter } from '../src/utils/rate-limiters/meta_transaction_composable_rate_limiter';
import { MetaTransactionRollingValueLimiter } from '../src/utils/rate-limiters/meta_transaction_value_limiter';

import { getTestDBConnectionAsync } from './utils/db_connection';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';

const SUITE_NAME = 'rate limiter tests';
const TEST_API_KEY = 'test-key';
const TEST_FIRST_TAKER_ADDRESS = 'one';
const TEST_SECOND_TAKER_ADDRESS = 'two';
const DAILY_LIMIT = 10;

let connection: Connection;
let transactionRepository: Repository<TransactionEntity>;
let dailyLimiter: MetaTransactionRateLimiter;
let rollingLimiter: MetaTransactionRollingLimiter;
let composedLimiter: MetaTransactionComposableLimiter;
let rollingLimiterForTakerAddress: MetaTransactionRollingLimiter;
let rollingValueLimiter: MetaTransactionRollingValueLimiter;

function* intGenerator(): Iterator<number> {
    let i = 0;
    while (true) {
        yield i++;
    }
}

const intGen = intGenerator();

const newTx = (
    apiKey: string,
    takerAddress?: string,
    values?: { value: number; gasPrice: number; gasUsed: number },
): TransactionEntity => {
    const tx = TransactionEntity.make({
        to: '',
        refHash: hexUtils.hash(intGen.next().value),
        takerAddress: takerAddress === undefined ? TEST_FIRST_TAKER_ADDRESS : takerAddress,
        apiKey,
        status: TransactionStates.Submitted,
        expectedMinedInSec: 123,
    });
    if (values !== undefined) {
        const { value, gasPrice, gasUsed } = values;
        tx.gasPrice = new BigNumber(gasPrice);
        tx.gasUsed = gasUsed;
        tx.value = new BigNumber(value);
    }
    return tx;
};

const generateNewTransactionsForKey = (
    apiKey: string,
    numberOfTransactions: number,
    takerAddress?: string,
    values?: { value: number; gasPrice: number; gasUsed: number },
): TransactionEntity[] => {
    const txes: TransactionEntity[] = [];
    for (let i = 0; i < numberOfTransactions; i++) {
        const tx = newTx(apiKey, takerAddress, values);
        txes.push(tx);
    }

    return txes;
};

// NOTE: Because TypeORM does not allow us to override entities createdAt
// directly, we resort to a raw query.
const backdateTransactions = async (txes: TransactionEntity[], num: number, unit: string): Promise<void> => {
    const txesString = txes.map(tx => `'${tx.refHash}'`).join(',');
    await transactionRepository.query(
        `UPDATE transactions SET created_at = now() - interval '${num} ${unit}' WHERE transactions.ref_hash IN (${txesString});`,
    );
};

const cleanTransactions = async (): Promise<void> => {
    await transactionRepository.query('DELETE FROM transactions;');
};

describe(SUITE_NAME, () => {
    before(async () => {
        await setupDependenciesAsync(SUITE_NAME);
        connection = await getTestDBConnectionAsync();

        transactionRepository = connection.getRepository(TransactionEntity);
        dailyLimiter = new MetaTransactionDailyLimiter(DatabaseKeysUsedForRateLimiter.ApiKey, connection, {
            allowedDailyLimit: DAILY_LIMIT,
        });
        rollingLimiter = new MetaTransactionRollingLimiter(DatabaseKeysUsedForRateLimiter.ApiKey, connection, {
            allowedLimit: 10,
            intervalNumber: 1,
            intervalUnit: RollingLimiterIntervalUnit.Hours,
        });
        rollingLimiterForTakerAddress = new MetaTransactionRollingLimiter(
            DatabaseKeysUsedForRateLimiter.TakerAddress,
            connection,
            {
                allowedLimit: 2,
                intervalNumber: 1,
                intervalUnit: RollingLimiterIntervalUnit.Minutes,
            },
        );
        rollingValueLimiter = new MetaTransactionRollingValueLimiter(
            DatabaseKeysUsedForRateLimiter.TakerAddress,
            connection,
            {
                allowedLimitEth: 1,
                intervalNumber: 1,
                intervalUnit: RollingLimiterIntervalUnit.Hours,
            },
        );
        composedLimiter = new MetaTransactionComposableLimiter([
            dailyLimiter,
            rollingLimiter,
            rollingLimiterForTakerAddress,
        ]);
    });
    after(async () => {
        await teardownDependenciesAsync(SUITE_NAME);
    });

    describe('api key daily rate limiter', async () => {
        const context = { apiKey: TEST_API_KEY, takerAddress: TEST_FIRST_TAKER_ADDRESS };

        it('should not trigger within limit', async () => {
            const firstCheck = await dailyLimiter.isAllowedAsync(context);
            expect(firstCheck.isAllowed).to.be.true();
            await transactionRepository.save(generateNewTransactionsForKey(TEST_API_KEY, DAILY_LIMIT - 1));
            const secondCheck = await dailyLimiter.isAllowedAsync(context);
            expect(secondCheck.isAllowed).to.be.true();
        });
        it('should not trigger for other api keys', async () => {
            await transactionRepository.save(generateNewTransactionsForKey('0ther-key', DAILY_LIMIT));
            const { isAllowed } = await dailyLimiter.isAllowedAsync(context);
            expect(isAllowed).to.be.true();
        });
        it('should not trigger because of keys from a day before', async () => {
            const txes = generateNewTransactionsForKey(TEST_API_KEY, DAILY_LIMIT);
            await transactionRepository.save(txes);
            // tslint:disable-next-line:custom-no-magic-numbers
            await backdateTransactions(txes, 24, 'hours');
            const { isAllowed } = await dailyLimiter.isAllowedAsync(context);
            expect(isAllowed).to.be.true();
        });
        it('should trigger after limit', async () => {
            await transactionRepository.save(generateNewTransactionsForKey(TEST_API_KEY, 1));
            const { isAllowed } = await dailyLimiter.isAllowedAsync(context);
            expect(isAllowed).to.be.false();
        });
    });
    describe('api rolling rate limiter', async () => {
        before(async () => {
            await cleanTransactions();
        });
        const context = { apiKey: TEST_API_KEY, takerAddress: TEST_FIRST_TAKER_ADDRESS };
        it('shoult not trigger within limit', async () => {
            const firstCheck = await rollingLimiter.isAllowedAsync(context);
            expect(firstCheck.isAllowed).to.be.true();
            await transactionRepository.save(generateNewTransactionsForKey(TEST_API_KEY, DAILY_LIMIT - 1));
            const secondCheck = await rollingLimiter.isAllowedAsync(context);
            expect(secondCheck.isAllowed).to.be.true();
        });
        it('should not trigger because of keys from an interval before', async () => {
            const txes = generateNewTransactionsForKey(TEST_API_KEY, DAILY_LIMIT);
            await transactionRepository.save(txes);
            // tslint:disable-next-line:custom-no-magic-numbers
            await backdateTransactions(txes, 61, 'minutes');
            const { isAllowed } = await rollingLimiter.isAllowedAsync(context);
            expect(isAllowed).to.be.true();
        });
        it('should trigger after limit', async () => {
            const txes = generateNewTransactionsForKey(TEST_API_KEY, 1);
            await transactionRepository.save(txes);
            // tslint:disable-next-line:custom-no-magic-numbers
            await backdateTransactions(txes, 15, 'minutes');
            const { isAllowed } = await rollingLimiter.isAllowedAsync(context);
            expect(isAllowed).to.be.false();
        });
    });
    describe('api composable rate limiter', () => {
        before(async () => {
            await cleanTransactions();
        });

        const firstTakerContext = { apiKey: TEST_API_KEY, takerAddress: TEST_FIRST_TAKER_ADDRESS };
        const secondTakerContext = { apiKey: TEST_API_KEY, takerAddress: TEST_SECOND_TAKER_ADDRESS };

        it('should not trigger within limits', async () => {
            const firstCheck = await composedLimiter.isAllowedAsync(secondTakerContext);
            expect(firstCheck.isAllowed).to.be.true();
        });

        it('should trigger for the first taker address, but not the second', async () => {
            // tslint:disable-next-line:custom-no-magic-numbers
            const txes = generateNewTransactionsForKey(TEST_API_KEY, 2, TEST_FIRST_TAKER_ADDRESS);
            await transactionRepository.save(txes);
            const firstTakerCheck = await composedLimiter.isAllowedAsync(firstTakerContext);
            expect(firstTakerCheck.isAllowed).to.be.false();
            const secondTakerCheck = await composedLimiter.isAllowedAsync(secondTakerContext);
            expect(secondTakerCheck.isAllowed).to.be.true();
        });
        it('should trigger all rate limiters', async () => {
            // tslint:disable-next-line:custom-no-magic-numbers
            const txes = generateNewTransactionsForKey(TEST_API_KEY, 20, TEST_SECOND_TAKER_ADDRESS);
            await transactionRepository.save(txes);
            const check = await composedLimiter.isAllowedAsync(secondTakerContext);
            expect(check.isAllowed).to.be.false();
        });
    });
    describe('value rate limiter', () => {
        before(async () => {
            await cleanTransactions();
        });

        const context = { apiKey: TEST_API_KEY, takerAddress: TEST_SECOND_TAKER_ADDRESS };
        // tslint:disable:custom-no-magic-numbers
        it('should not trigger when under value limit', async () => {
            const txes = generateNewTransactionsForKey(TEST_API_KEY, 5, TEST_SECOND_TAKER_ADDRESS, {
                value: 10 ** 17,
                gasPrice: 10 ** 9,
                gasUsed: 400000,
            });
            await transactionRepository.save(txes);
            const check = await rollingValueLimiter.isAllowedAsync(context);
            expect(check.isAllowed).to.be.true();
        });
        it('should trigger when over value limit', async () => {
            const txes = generateNewTransactionsForKey(TEST_API_KEY, 10, TEST_SECOND_TAKER_ADDRESS, {
                value: 10 ** 18,
                gasPrice: 10 ** 9,
                gasUsed: 400000,
            });
            await transactionRepository.save(txes);
            const check = await rollingValueLimiter.isAllowedAsync(context);
            expect(check.isAllowed).to.be.false();
        });
        // tslint:enable:custom-no-magic-numbers
    });
    describe('parser utils', () => {
        it('should throw on invalid json string', () => {
            const configString = '<html></html>';
            expect(() => {
                parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString);
            }).to.throw('Unexpected token < in JSON at position 0');
        });
        it('should throw on invalid configuration', () => {
            const configString = '{"api_key":{"daily": true}}';
            expect(() => {
                parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString);
            }).to.throw('Expected allowedDailyLimit to be of type number, encountered: undefined');
        });
        it('should throw on invalid enum in rolling configuration', () => {
            const configString =
                '{"api_key":{"rolling": {"allowedLimit":1,"intervalNumber":1,"intervalUnit":"months"}}}';
            expect(() => {
                parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString);
            }).to.throw("Expected intervalUnit to be one of: 'hours', 'minutes', encountered: months");
        });
        it('should throw on an unsupported database key', () => {
            const config = {
                api_key: {},
                taker_address: {},
                private_key: {},
            };
            expect(() => {
                parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(JSON.stringify(config));
            }).to.throw("Expected dbField to be one of: 'api_key', 'taker_address', encountered: private_key");
        });
        it('should parse daily configuration properly', () => {
            const expectedDailyConfig = { allowedDailyLimit: 1 };
            const configString = `{"api_key":{"daily": ${JSON.stringify(expectedDailyConfig)}}}`;
            const config = parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString);
            expect(config.api_key!.daily).to.be.deep.equal(expectedDailyConfig);
        });
        it('should parse rolling configuration properly', () => {
            const expectedRollingConfig = { allowedLimit: 1, intervalNumber: 1, intervalUnit: 'hours' };
            const configString = `{"api_key":{"rolling": ${JSON.stringify(expectedRollingConfig)}}}`;
            const config = parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString);
            expect(config.api_key!.rolling).to.be.deep.equal(expectedRollingConfig);
        });
        it('should parse rolling value configuration properly', () => {
            const expectedRollingValueConfig = { allowedLimitEth: 1, intervalNumber: 1, intervalUnit: 'hours' };
            const configString = `{"api_key":{"rollingValue": ${JSON.stringify(expectedRollingValueConfig)}}}`;
            const config = parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString);
            expect(config.api_key!.rollingValue).to.be.deep.equal(expectedRollingValueConfig);
        });
        it('should parse a full configuration', () => {
            const expectedConfig = {
                api_key: {
                    daily: { allowedDailyLimit: 1 },
                    rolling: { allowedLimit: 1, intervalNumber: 1, intervalUnit: 'hours' },
                    rollingValue: { allowedLimitEth: 1, intervalNumber: 1, intervalUnit: 'hours' },
                },
                taker_address: {
                    daily: { allowedDailyLimit: 1 },
                    rolling: { allowedLimit: 1, intervalNumber: 1, intervalUnit: 'hours' },
                    rollingValue: { allowedLimitEth: 1, intervalNumber: 1, intervalUnit: 'hours' },
                },
            };
            const parsedConfig = parseUtils.parseJsonStringForMetaTransactionRateLimitConfigOrThrow(
                JSON.stringify(expectedConfig),
            );
            expect(parsedConfig).to.be.deep.equal(expectedConfig);
        });
    });
});
