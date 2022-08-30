import { blockchainTests, describe, expect, toBaseUnitAmount, Web3ProviderEngine } from '@0x/contracts-test-utils';
import { RPCSubprovider } from '@0x/subproviders';
import { BigNumber, providerUtils } from '@0x/utils';

import { artifacts } from '../../artifacts';
import { ERC20BridgeSamplerContract } from '../../wrappers';

export const VB = '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b';

blockchainTests.skip('Mainnet Sampler Tests', (env) => {
    let testContract: ERC20BridgeSamplerContract;
    const fakeSamplerAddress = '0x1111111111111111111111111111111111111111';
    const overrides = {
        [fakeSamplerAddress]: {
            code: artifacts.ERC20BridgeSampler.compilerOutput.evm.deployedBytecode.object,
        },
    };
    before(async () => {
        const provider = new Web3ProviderEngine();
        provider.addProvider(new RPCSubprovider(process.env.RPC_URL!));
        providerUtils.startProviderEngine(provider);
        testContract = new ERC20BridgeSamplerContract(fakeSamplerAddress, provider, {
            ...env.txDefaults,
            from: VB,
        });
    });
    describe('Curve', () => {
        const CURVE_ADDRESS = '0x45f783cce6b7ff23b2ab2d70e416cdb7d6055f51';
        const DAI_TOKEN_INDEX = new BigNumber(0);
        const USDC_TOKEN_INDEX = new BigNumber(1);
        const CURVE_INFO = {
            poolAddress: CURVE_ADDRESS,
            sellQuoteFunctionSelector: '0x07211ef7',
            buyQuoteFunctionSelector: '0x0e71d1b9',
        };

        describe('sampleSellsFromCurve()', () => {
            it('samples sells from Curve DAI->USDC', async () => {
                const samples = await testContract
                    .sampleSellsFromCurve(CURVE_INFO, DAI_TOKEN_INDEX, USDC_TOKEN_INDEX, [toBaseUnitAmount(1)])
                    .callAsync({ overrides });
                expect(samples.length).to.be.bignumber.greaterThan(0);
                expect(samples[0]).to.be.bignumber.greaterThan(0);
            });

            it('samples sells from Curve USDC->DAI', async () => {
                const samples = await testContract
                    .sampleSellsFromCurve(CURVE_INFO, USDC_TOKEN_INDEX, DAI_TOKEN_INDEX, [toBaseUnitAmount(1, 6)])
                    .callAsync({ overrides });
                expect(samples.length).to.be.bignumber.greaterThan(0);
                expect(samples[0]).to.be.bignumber.greaterThan(0);
            });
        });

        describe('sampleBuysFromCurve()', () => {
            it('samples buys from Curve DAI->USDC', async () => {
                // From DAI to USDC
                // I want to buy 1 USDC
                const samples = await testContract
                    .sampleBuysFromCurve(CURVE_INFO, DAI_TOKEN_INDEX, USDC_TOKEN_INDEX, [toBaseUnitAmount(1, 6)])
                    .callAsync({ overrides });
                expect(samples.length).to.be.bignumber.greaterThan(0);
                expect(samples[0]).to.be.bignumber.greaterThan(0);
            });

            it('samples buys from Curve USDC->DAI', async () => {
                // From USDC to DAI
                // I want to buy 1 DAI
                const samples = await testContract
                    .sampleBuysFromCurve(CURVE_INFO, USDC_TOKEN_INDEX, DAI_TOKEN_INDEX, [toBaseUnitAmount(1)])
                    .callAsync({ overrides });
                expect(samples.length).to.be.bignumber.greaterThan(0);
                expect(samples[0]).to.be.bignumber.greaterThan(0);
            });
        });
    });
});
