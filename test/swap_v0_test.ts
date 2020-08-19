import { ERC20BridgeSource } from '@0x/asset-swapper';
import { expect } from '@0x/contracts-test-utils';
import { BlockchainLifecycle, web3Factory, Web3ProviderEngine } from '@0x/dev-utils';
import { ObjectMap, SignedOrder } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as HttpStatus from 'http-status-codes';
import 'mocha';

import * as config from '../src/config';
import { SWAP_PATH as BASE_SWAP_PATH } from '../src/constants';
import { ValidationErrorItem } from '../src/errors';
import { logger } from '../src/logger';
import { GetSwapQuoteResponse } from '../src/types';

import {
    CONTRACT_ADDRESSES,
    MAX_MINT_AMOUNT,
    SYMBOL_TO_ADDRESS,
    UNKNOWN_TOKEN_ADDRESS,
    UNKNOWN_TOKEN_ASSET_DATA,
    WETH_ASSET_DATA,
    WETH_TOKEN_ADDRESS,
    ZRX_ASSET_DATA,
    ZRX_TOKEN_ADDRESS,
} from './constants';
import { setupApiAsync, setupMeshAsync, teardownApiAsync, teardownMeshAsync } from './utils/deployment';
import { constructRoute, httpGetAsync } from './utils/http_utils';
import { MAKER_WETH_AMOUNT, MeshTestUtils } from './utils/mesh_test_utils';
import { liquiditySources0xOnly } from './utils/mocks';

const SUITE_NAME = '/swap/v0';
const SWAP_PATH = `${BASE_SWAP_PATH}/v0`;

const EXCLUDED_SOURCES = Object.values(ERC20BridgeSource).filter(s => s !== ERC20BridgeSource.Native);
const DEFAULT_QUERY_PARAMS = {
    buyToken: 'ZRX',
    sellToken: 'WETH',
    excludedSources: EXCLUDED_SOURCES.join(','),
};

const ONE_THOUSAND_IN_BASE = new BigNumber('1000000000000000000000');

describe(SUITE_NAME, () => {
    let meshUtils: MeshTestUtils;
    let accounts: string[];
    let takerAddress: string;
    let makerAddress: string;

    let blockchainLifecycle: BlockchainLifecycle;
    let provider: Web3ProviderEngine;

    before(async () => {
        await setupApiAsync(SUITE_NAME);
        // connect to ganache and run contract migrations
        const ganacheConfigs = {
            shouldUseInProcessGanache: false,
            shouldAllowUnlimitedContractSize: true,
            rpcUrl: config.ETHEREUM_RPC_URL,
        };
        provider = web3Factory.getRpcProvider(ganacheConfigs);

        const web3Wrapper = new Web3Wrapper(provider);
        blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);

        accounts = await web3Wrapper.getAvailableAddressesAsync();
        [makerAddress, takerAddress] = accounts;

        // Set up liquidity.
        await blockchainLifecycle.startAsync();
        await setupMeshAsync(SUITE_NAME);
        meshUtils = new MeshTestUtils(provider);
        await meshUtils.setupUtilsAsync();
        await meshUtils.addPartialOrdersAsync([
            {
                makerAssetData: ZRX_ASSET_DATA,
                takerAssetData: WETH_ASSET_DATA,
                makerAssetAmount: ONE_THOUSAND_IN_BASE,
                takerAssetAmount: ONE_THOUSAND_IN_BASE,
            },
            {
                makerAssetData: ZRX_ASSET_DATA,
                takerAssetData: WETH_ASSET_DATA,
                makerAssetAmount: ONE_THOUSAND_IN_BASE,
                // tslint:disable:custom-no-magic-numbers
                takerAssetAmount: ONE_THOUSAND_IN_BASE.multipliedBy(2),
            },
            {
                makerAssetData: ZRX_ASSET_DATA,
                takerAssetData: WETH_ASSET_DATA,
                makerAssetAmount: MAX_MINT_AMOUNT,
                // tslint:disable:custom-no-magic-numbers
                takerAssetAmount: ONE_THOUSAND_IN_BASE.multipliedBy(3),
            },
            {
                makerAssetData: WETH_ASSET_DATA,
                takerAssetData: ZRX_ASSET_DATA,
                makerAssetAmount: MAKER_WETH_AMOUNT,
                takerAssetAmount: ONE_THOUSAND_IN_BASE,
            },
            {
                makerAssetData: ZRX_ASSET_DATA,
                takerAssetData: UNKNOWN_TOKEN_ASSET_DATA,
                makerAssetAmount: ONE_THOUSAND_IN_BASE,
                takerAssetAmount: ONE_THOUSAND_IN_BASE,
            },
        ]);
    });
    after(async () => {
        await blockchainLifecycle.revertAsync();
        await teardownMeshAsync(SUITE_NAME);
        await teardownApiAsync(SUITE_NAME);
    });
    describe('/quote', () => {
        it("with INSUFFICIENT_ASSET_LIQUIDITY when there's no liquidity (empty orderbook, sampling excluded, no RFQ)", async () => {
            await quoteAndExpectAsync(
                { buyAmount: '10000000000000000000000000000000' },
                {
                    validationErrors: [
                        {
                            code: 1004,
                            field: 'buyAmount',
                            reason: 'INSUFFICIENT_ASSET_LIQUIDITY',
                        },
                    ],
                },
            );
        });

        describe(`valid token parameter permutations`, async () => {
            const parameterPermutations = [
                { buyToken: 'ZRX', sellToken: 'WETH', buyAmount: '1000' },
                { buyToken: 'WETH', sellToken: 'ZRX', buyAmount: '1000' },
                { buyToken: ZRX_TOKEN_ADDRESS, sellToken: 'WETH', buyAmount: '1000' },
                { buyToken: ZRX_TOKEN_ADDRESS, sellToken: WETH_TOKEN_ADDRESS, buyAmount: '1000' },
                { buyToken: 'ZRX', sellToken: UNKNOWN_TOKEN_ADDRESS, buyAmount: '1000' },
            ];
            for (const parameters of parameterPermutations) {
                it(`should return a valid quote with ${JSON.stringify(parameters)}`, async () => {
                    await quoteAndExpectAsync(parameters, {
                        buyAmount: parameters.buyAmount,
                        sellTokenAddress: parameters.sellToken.startsWith('0x')
                            ? parameters.sellToken
                            : SYMBOL_TO_ADDRESS[parameters.sellToken],
                        buyTokenAddress: parameters.buyToken.startsWith('0x')
                            ? parameters.buyToken
                            : SYMBOL_TO_ADDRESS[parameters.buyToken],
                    });
                });
            }
        });

        it('should respect buyAmount', async () => {
            await quoteAndExpectAsync({ buyAmount: '1234' }, { buyAmount: '1234' });
        });
        it('should respect sellAmount', async () => {
            await quoteAndExpectAsync({ sellAmount: '1234' }, { sellAmount: '1234' });
        });
        it('should respect gasPrice', async () => {
            await quoteAndExpectAsync({ sellAmount: '1234', gasPrice: '150000000000' }, { gasPrice: '150000000000' });
        });
        it('should respect excludedSources', async () => {
            await quoteAndExpectAsync(
                {
                    sellAmount: '1234',
                    excludedSources: Object.values(ERC20BridgeSource).join(','),
                },
                {
                    validationErrors: [
                        {
                            code: 1004,
                            field: 'excludedSources',
                            reason: 'Request excluded all sources',
                        },
                    ],
                },
            );
        });
        it('should return a Forwarder transaction for sellToken=ETH', async () => {
            await quoteAndExpectAsync(
                {
                    sellToken: 'WETH',
                    sellAmount: '1234',
                },
                {
                    to: CONTRACT_ADDRESSES.exchange,
                },
            );
            await quoteAndExpectAsync(
                {
                    sellToken: 'ETH',
                    sellAmount: '1234',
                },
                {
                    to: CONTRACT_ADDRESSES.forwarder,
                },
            );
        });
        it('should not throw a validation error if takerAddress can complete the quote', async () => {
            // The maker has an allowance
            await quoteAndExpectAsync(
                {
                    takerAddress: makerAddress,
                    sellToken: 'WETH',
                    buyToken: 'ZRX',
                    sellAmount: '10000',
                },
                {
                    sellAmount: '10000',
                },
            );
        });
        it('should throw a validation error if takerAddress cannot complete the quote', async () => {
            // The taker does not have an allowance
            await quoteAndExpectAsync(
                {
                    takerAddress,
                    sellToken: 'WETH',
                    buyToken: 'ZRX',
                    sellAmount: '10000',
                },
                {
                    revertErrorReason: 'IncompleteFillError',
                },
            );
        });
        it('should not return estimatedGasTokenRefund: 0 if there are not gas tokens in our wallet', async () => {
            await quoteAndExpectAsync(
                {
                    sellAmount: '1234',
                },
                {
                    estimatedGasTokenRefund: '0',
                },
            );
        });
    });

    describe('/tokens', () => {
        it('should return a list of known tokens', async () => {
            const response = await httpGetAsync({ route: `${SWAP_PATH}/tokens` });
            expect(response.type).to.be.eq('application/json');
            expect(response.status).to.be.eq(HttpStatus.OK);
            // tslint:disable-next-line:no-unused-expression
            expect(response.body.records).to.be.an('array').that.is.not.empty;
        });
    });

    describe('/prices', () => {
        it('should return accurate pricing', async () => {
            // Defaults to WETH.
            const response = await httpGetAsync({ route: `${SWAP_PATH}/prices` });
            expect(response.type).to.be.eq('application/json');
            expect(response.status).to.be.eq(HttpStatus.OK);
            expect(response.body.records[0].price).to.be.eq('0.3');
        });
        it('should respect the sellToken parameter', async () => {
            const response = await httpGetAsync({ route: `${SWAP_PATH}/prices?sellToken=ZRX` });
            expect(response.type).to.be.eq('application/json');
            expect(response.status).to.be.eq(HttpStatus.OK);
            expect(response.body.records[0].price).to.be.eq('1000');
        });
    });
});

interface QuoteAssertion {
    buyAmount: string;
    sellAmount: string;
    price: string;
    guaranteedPrice: string;
    gasPrice: string;
    to: string;
    signedOrders: SignedOrder[];
    sellTokenAddress: string;
    buyTokenAddress: string;
    estimatedGasTokenRefund: string;
    validationErrors: ValidationErrorItem[];
    revertErrorReason: string;
}

async function quoteAndExpectAsync(
    queryParams: ObjectMap<string>,
    quoteAssertions: Partial<QuoteAssertion>,
): Promise<void> {
    const route = constructRoute({
        baseRoute: `${SWAP_PATH}/quote`,
        queryParams: {
            ...DEFAULT_QUERY_PARAMS,
            ...queryParams,
        },
    });
    const response = await httpGetAsync({ route });
    expect(response.type).to.be.eq('application/json');
    if (quoteAssertions.revertErrorReason) {
        expect(response.status).to.be.eq(HttpStatus.BAD_REQUEST);
        expect(response.body.code).to.eq(105);
        expect(response.body.reason).to.be.eql(quoteAssertions.revertErrorReason);
        return;
    }
    if (quoteAssertions.validationErrors) {
        expect(response.status).to.be.eq(HttpStatus.BAD_REQUEST);
        expect(response.body.code).to.eq(100);
        expect(response.body.validationErrors).to.be.eql(quoteAssertions.validationErrors);
        return;
    }
    if (response.status !== HttpStatus.OK) {
        logger.warn(response);
    }
    expect(response.status).to.be.eq(HttpStatus.OK);
    expectCorrectQuote(response.body, quoteAssertions);
}

function expectCorrectQuote(quoteResponse: GetSwapQuoteResponse, quoteAssertions: Partial<QuoteAssertion>): void {
    for (const property of Object.keys(quoteAssertions)) {
        expect(quoteResponse[property]).to.be.eql(quoteAssertions[property]);
    }
    // Only have 0x liquidity for now.
    expect(quoteResponse.sources).to.be.eql(liquiditySources0xOnly);
}
