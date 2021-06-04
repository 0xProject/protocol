import { ChainId } from '@0x/contract-addresses';
import { blockchainTests, describe, expect, toBaseUnitAmount, Web3ProviderEngine } from '@0x/contracts-test-utils';
import { RPCSubprovider } from '@0x/subproviders';
import { BigNumber, NULL_BYTES, providerUtils } from '@0x/utils';

import { ERC20BridgeSource } from '../../src';
import { getCurveLikeInfosForPair } from '../../src/utils/market_operation_utils/bridge_source_utils';
import { KYBER_CONFIG_BY_CHAIN_ID, MAINNET_TOKENS } from '../../src/utils/market_operation_utils/constants';
import { artifacts } from '../artifacts';
import { ERC20BridgeSamplerContract } from '../wrappers';

export const VB = '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b';

// tslint:disable: custom-no-magic-numbers

blockchainTests.skip('Mainnet Sampler Tests', env => {
    let testContract: ERC20BridgeSamplerContract;
    const fakeSamplerAddress = '0x1111111111111111111111111111111111111111';
    const overrides = {
        [fakeSamplerAddress]: {
            code: artifacts.ERC20BridgeSampler.compilerOutput.evm.deployedBytecode.object,
        },
    };
    before(async () => {
        const provider = new Web3ProviderEngine();
        // tslint:disable-next-line:no-non-null-assertion
        provider.addProvider(new RPCSubprovider(process.env.RPC_URL!));
        providerUtils.startProviderEngine(provider);
        testContract = new ERC20BridgeSamplerContract(fakeSamplerAddress, provider, {
            ...env.txDefaults,
            from: VB,
        });
    });
    describe('Curve', () => {
        describe('sampleSellsFromCurve()', () => {
            it('samples sells from Curve DAI->USDC', async () => {
                const CURVE_INFO = getCurveLikeInfosForPair(
                    ChainId.Mainnet,
                    MAINNET_TOKENS.DAI,
                    MAINNET_TOKENS.USDC,
                    ERC20BridgeSource.Curve,
                )[0];
                const samples = await testContract
                    .sampleSellsFromCurve(
                        {
                            curveAddress: CURVE_INFO.poolAddress,
                            fromCoinIdx: new BigNumber(CURVE_INFO.takerTokenIdx),
                            toCoinIdx: new BigNumber(CURVE_INFO.makerTokenIdx),
                            exchangeFunctionSelector: CURVE_INFO.exchangeFunctionSelector,
                        },
                        MAINNET_TOKENS.DAI,
                        MAINNET_TOKENS.USDC,
                        [toBaseUnitAmount(1)],
                    )
                    .callAsync({ overrides });
                expect(samples.length).to.be.bignumber.greaterThan(0);
                expect(samples[0]).to.be.bignumber.greaterThan(0);
            });

            it('samples sells from Curve USDC->DAI', async () => {
                const CURVE_INFO = getCurveLikeInfosForPair(
                    ChainId.Mainnet,
                    MAINNET_TOKENS.USDC,
                    MAINNET_TOKENS.DAI,
                    ERC20BridgeSource.Curve,
                )[0];
                const samples = await testContract
                    .sampleSellsFromCurve(
                        {
                            curveAddress: CURVE_INFO.poolAddress,
                            fromCoinIdx: new BigNumber(CURVE_INFO.takerTokenIdx),
                            toCoinIdx: new BigNumber(CURVE_INFO.makerTokenIdx),
                            exchangeFunctionSelector: CURVE_INFO.exchangeFunctionSelector,
                        },
                        MAINNET_TOKENS.USDC,
                        MAINNET_TOKENS.DAI,
                        [toBaseUnitAmount(1, 6)],
                    )
                    .callAsync({ overrides });
                expect(samples.length).to.be.bignumber.greaterThan(0);
                expect(samples[0]).to.be.bignumber.greaterThan(0);
            });
        });

        describe('sampleBuysFromCurve()', () => {
            const CURVE_INFO = getCurveLikeInfosForPair(
                ChainId.Mainnet,
                MAINNET_TOKENS.DAI,
                MAINNET_TOKENS.USDC,
                ERC20BridgeSource.Curve,
            )[0];
            it('samples buys from Curve DAI->USDC', async () => {
                // From DAI to USDC
                // I want to buy 1 USDC
                const samples = await testContract
                    .sampleBuysFromCurve(
                        {
                            curveAddress: CURVE_INFO.poolAddress,
                            fromCoinIdx: new BigNumber(CURVE_INFO.takerTokenIdx),
                            toCoinIdx: new BigNumber(CURVE_INFO.makerTokenIdx),
                            exchangeFunctionSelector: CURVE_INFO.exchangeFunctionSelector,
                        },
                        MAINNET_TOKENS.DAI,
                        MAINNET_TOKENS.USDC,
                        [toBaseUnitAmount(1, 6)],
                    )
                    .callAsync({ overrides });
                expect(samples.length).to.be.bignumber.greaterThan(0);
                expect(samples[0]).to.be.bignumber.greaterThan(0);
            });

            it('samples buys from Curve USDC->DAI', async () => {
                // From USDC to DAI
                // I want to buy 1 DAI
                const samples = await testContract
                    .sampleBuysFromCurve(
                        {
                            curveAddress: CURVE_INFO.poolAddress,
                            fromCoinIdx: new BigNumber(CURVE_INFO.takerTokenIdx),
                            toCoinIdx: new BigNumber(CURVE_INFO.makerTokenIdx),
                            exchangeFunctionSelector: CURVE_INFO.exchangeFunctionSelector,
                        },
                        MAINNET_TOKENS.USDC,
                        MAINNET_TOKENS.DAI,
                        [toBaseUnitAmount(1)],
                    )
                    .callAsync({ overrides });
                expect(samples.length).to.be.bignumber.greaterThan(0);
                expect(samples[0]).to.be.bignumber.greaterThan(0);
            });
        });
    });
    describe('Kyber', () => {
        const WETH = MAINNET_TOKENS.WETH;
        const DAI = MAINNET_TOKENS.DAI;
        const USDC = MAINNET_TOKENS.USDC;
        const RESERVE_OFFSET = new BigNumber(0);
        const KYBER_OPTS = {
            ...KYBER_CONFIG_BY_CHAIN_ID[ChainId.Mainnet],
            reserveOffset: RESERVE_OFFSET,
            hint: NULL_BYTES,
        };
        describe('sampleSellsFromKyberNetwork()', () => {
            it('samples sells from Kyber DAI->WETH', async () => {
                const [, samples] = await testContract
                    .sampleSellsFromKyberNetwork(KYBER_OPTS, DAI, WETH, [toBaseUnitAmount(1)])
                    .callAsync({ overrides });
                expect(samples.length).to.be.bignumber.greaterThan(0);
                expect(samples[0]).to.be.bignumber.greaterThan(0);
            });
            it('samples sells from Kyber WETH->DAI', async () => {
                const [, samples] = await testContract
                    .sampleSellsFromKyberNetwork(KYBER_OPTS, WETH, DAI, [toBaseUnitAmount(1)])
                    .callAsync({ overrides });
                expect(samples.length).to.be.bignumber.greaterThan(0);
                expect(samples[0]).to.be.bignumber.greaterThan(0);
            });
            it('samples sells from Kyber DAI->USDC', async () => {
                const [, samples] = await testContract
                    .sampleSellsFromKyberNetwork(KYBER_OPTS, DAI, USDC, [toBaseUnitAmount(1)])
                    .callAsync({ overrides });
                expect(samples.length).to.be.bignumber.greaterThan(0);
                expect(samples[0]).to.be.bignumber.greaterThan(0);
            });
        });

        describe('sampleBuysFromKyber()', () => {
            it('samples buys from Kyber WETH->DAI', async () => {
                // From ETH to DAI
                // I want to buy 1 DAI
                const [, samples] = await testContract
                    .sampleBuysFromKyberNetwork(KYBER_OPTS, WETH, DAI, [toBaseUnitAmount(1)])
                    .callAsync({ overrides });
                expect(samples.length).to.be.bignumber.greaterThan(0);
                expect(samples[0]).to.be.bignumber.greaterThan(0);
            });

            it('samples buys from Kyber DAI->WETH', async () => {
                // From USDC to DAI
                // I want to buy 1 WETH
                const [, samples] = await testContract
                    .sampleBuysFromKyberNetwork(KYBER_OPTS, DAI, WETH, [toBaseUnitAmount(1)])
                    .callAsync({ overrides });
                expect(samples.length).to.be.bignumber.greaterThan(0);
                expect(samples[0]).to.be.bignumber.greaterThan(0);
            });
        });
    });
});
