import { BalanceCheckerContract } from '@0x/asset-swapper';
import { artifacts } from '@0x/asset-swapper/lib/src/artifacts';
import { BlockParamLiteral, SupportedProvider, Web3Wrapper } from '@0x/dev-utils';
import { BigNumber, logUtils } from '@0x/utils';
import * as delay from 'delay';
import * as _ from 'lodash';
import { Gauge } from 'prom-client';
import { Connection } from 'typeorm';

import { defaultHttpServiceWithRateLimiterConfig } from '../config';
import { ONE_SECOND_MS } from '../constants';
import { getDBConnectionAsync } from '../db_connection';
import { MakerBalanceChainCacheEntity } from '../entities';
import { logger } from '../logger';
import { providerUtils } from '../utils/provider_utils';
import { createResultCache, ResultCache } from '../utils/result_cache';

// tslint:disable-next-line:custom-no-magic-numbers
const DELAY_WHEN_NEW_BLOCK_FOUND = ONE_SECOND_MS * 5;
const DELAY_WHEN_NEW_BLOCK_NOT_FOUND = ONE_SECOND_MS;
// tslint:disable-next-line:custom-no-magic-numbers
const CACHE_MAKER_TOKENS_FOR_MS = ONE_SECOND_MS * 30;
// The eth_call will run out of gas if there are too many balance calls at once
const MAX_BALANCE_CHECKS_PER_CALL = 1000;
const BALANCE_CHECKER_GAS_LIMIT = 5500000;
// Maximum balances to save at once
const MAX_ROWS_TO_UPDATE = 1000;

const RANDOM_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff';

// Metric collection related fields
const LATEST_BLOCK_PROCESSED_GAUGE = new Gauge({
    name: 'rfqtw_latest_block_processed',
    help: 'Latest block processed by the RFQ worker process',
    labelNames: ['workerId'],
});

const MAKER_BALANCE_CACHE_RESULT_COUNT = new Gauge({
    name: 'maker_balance_cache_result_count',
    help: 'Records the number of records being returned by the DB',
    labelNames: ['workerId'],
});

const MAKER_BALANCE_CACHE_RETRIEVAL_TIME = new Gauge({
    name: 'maker_balance_cache_retrieval_time',
    help: 'Records the amount of time needed to grab records',
    labelNames: ['workerId'],
});

process.on('uncaughtException', err => {
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', err => {
    if (err) {
        logger.error(err);
    }
});

interface BalancesCallInput {
    addresses: string[];
    tokens: string[];
}

if (require.main === module) {
    (async () => {
        logger.info('running RFQ balance cache runner');

        const provider = providerUtils.createWeb3Provider(defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl);
        const web3Wrapper = new Web3Wrapper(provider);

        const connection = await getDBConnectionAsync();
        const balanceCheckerContractInterface = getBalanceCheckerContractInterface(RANDOM_ADDRESS, provider);

        await runRfqBalanceCacheAsync(web3Wrapper, connection, balanceCheckerContractInterface);
    })().catch(error => logger.error(error.stack));
}

async function runRfqBalanceCacheAsync(
    web3Wrapper: Web3Wrapper,
    connection: Connection,
    balanceCheckerContractInterface: BalanceCheckerContract,
): Promise<void> {
    const workerId = _.uniqueId('rfqw_');
    let lastBlockSeen = -1;
    while (true) {
        const newBlock = await web3Wrapper.getBlockNumberAsync();
        if (lastBlockSeen < newBlock) {
            lastBlockSeen = newBlock;
            LATEST_BLOCK_PROCESSED_GAUGE.labels(workerId).set(lastBlockSeen);
            logUtils.log(
                {
                    block: lastBlockSeen,
                    workerId,
                },
                'Found new block',
            );

            await cacheRfqBalancesAsync(connection, balanceCheckerContractInterface, true, workerId);

            await delay(DELAY_WHEN_NEW_BLOCK_FOUND);
        } else {
            await delay(DELAY_WHEN_NEW_BLOCK_NOT_FOUND);
        }
    }
}

/**
 * This function retrieves and caches ERC20 balances of RFQ market makers
 */
export async function cacheRfqBalancesAsync(
    connection: Connection,
    balanceCheckerContractInterface: BalanceCheckerContract,
    codeOverride: boolean,
    workerId: string,
): Promise<void> {
    const makerTokens = await getMakerTokensAsync(connection, workerId);
    const balancesCallInput = splitValues(makerTokens);

    const updateTime = new Date();
    const erc20Balances = await getErc20BalancesAsync(balanceCheckerContractInterface, balancesCallInput, codeOverride);

    await updateErc20BalancesAsync(balancesCallInput, erc20Balances, connection, updateTime);
}

// NOTE: this only returns a partial entity class, just token address and maker address
// Cache the query results to reduce reads from the DB
let MAKER_TOKEN_CACHE: ResultCache<MakerBalanceChainCacheEntity[]>;
async function getMakerTokensAsync(connection: Connection, workerId: string): Promise<MakerBalanceChainCacheEntity[]> {
    const start = new Date().getTime();

    if (!MAKER_TOKEN_CACHE) {
        MAKER_TOKEN_CACHE = createResultCache<any[]>(
            () =>
                connection
                    .getRepository(MakerBalanceChainCacheEntity)
                    .createQueryBuilder('maker_balance_chain_cache')
                    .select(['maker_balance_chain_cache.tokenAddress', 'maker_balance_chain_cache.makerAddress'])
                    .getMany(),
            CACHE_MAKER_TOKENS_FOR_MS,
        );
    }
    const results = (await MAKER_TOKEN_CACHE.getResultAsync()).result;

    MAKER_BALANCE_CACHE_RESULT_COUNT.labels(workerId).set(results.length);
    MAKER_BALANCE_CACHE_RETRIEVAL_TIME.labels(workerId).set(new Date().getTime() - start);

    return results;
}

function splitValues(makerTokens: MakerBalanceChainCacheEntity[]): BalancesCallInput {
    const functionInputs: BalancesCallInput = { addresses: [], tokens: [] };

    return makerTokens.reduce(({ addresses, tokens }, makerToken) => {
        return {
            addresses: addresses.concat(makerToken.makerAddress!),
            tokens: tokens.concat(makerToken.tokenAddress!),
        };
    }, functionInputs);
}

/**
 * Returns the balaceChecker interface given a random address
 */
export function getBalanceCheckerContractInterface(
    contractAddress: string,
    provider: SupportedProvider,
): BalanceCheckerContract {
    return new BalanceCheckerContract(contractAddress, provider, { gas: BALANCE_CHECKER_GAS_LIMIT });
}

async function getErc20BalancesAsync(
    balanceCheckerContractInterface: BalanceCheckerContract,
    balancesCallInput: BalancesCallInput,
    // HACK: allow for testing on ganache without override
    codeOverride: boolean,
): Promise<string[]> {
    // due to gas contraints limit the call to 1K balance checks
    const addressesChunkedArray = _.chunk(balancesCallInput.addresses, MAX_BALANCE_CHECKS_PER_CALL);
    const tokensChunkedArray = _.chunk(balancesCallInput.tokens, MAX_BALANCE_CHECKS_PER_CALL);

    const balanceCheckerByteCode = _.get(artifacts.BalanceChecker, 'compilerOutput.evm.deployedBytecode.object');

    const balances = await Promise.all(
        _.zip(addressesChunkedArray, tokensChunkedArray).map(async ([addressesChunk, tokensChunk]) => {
            const txOpts = codeOverride
                ? {
                      overrides: {
                          [RANDOM_ADDRESS]: {
                              code: balanceCheckerByteCode,
                          },
                      },
                  }
                : {};

            return balanceCheckerContractInterface
                .balances(addressesChunk!, tokensChunk!)
                .callAsync(txOpts, BlockParamLiteral.Latest);
        }),
    );

    const balancesFlattened = Array.prototype.concat.apply([], balances);

    return balancesFlattened.map((bal: any) => bal.toString());
}

async function updateErc20BalancesAsync(
    balancesCallInput: BalancesCallInput,
    balances: string[],
    connection: Connection,
    updateTime: Date,
): Promise<void> {
    const toSave = balancesCallInput.addresses.map((addr, i) => {
        const dbEntity = new MakerBalanceChainCacheEntity();

        dbEntity.makerAddress = addr;
        dbEntity.tokenAddress = balancesCallInput.tokens[i];
        dbEntity.balance = new BigNumber(balances[i]);
        dbEntity.timeOfSample = updateTime;

        return dbEntity;
    });

    await connection.getRepository(MakerBalanceChainCacheEntity).save(toSave, { chunk: MAX_ROWS_TO_UPDATE });
}
