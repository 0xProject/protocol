import { ChainId } from '@0x/contract-addresses';
import { blockchainTests, constants, describe, expect } from '@0x/contracts-test-utils';
import {
    artifacts as zeroExArtifacts,
    AvalancheBridgeAdapterContract,
    BSCBridgeAdapterContract,
    CeloBridgeAdapterContract,
    EthereumBridgeAdapterContract,
    FantomBridgeAdapterContract,
    OptimismBridgeAdapterContract,
    PolygonBridgeAdapterContract,
} from '@0x/contracts-zero-ex';

import {
    BUY_SOURCE_FILTER_BY_CHAIN_ID,
    ERC20BridgeSource,
    SELL_SOURCE_FILTER_BY_CHAIN_ID,
} from '../../../src/asset-swapper';
import { getErc20BridgeSourceToBridgeSource } from '../../../src/asset-swapper/utils/market_operation_utils/orders';

blockchainTests('Bridge adapter source compatibility tests', (env) => {
    describe('Avalanche', () => {
        let adapter: AvalancheBridgeAdapterContract;
        before(async () => {
            adapter = await AvalancheBridgeAdapterContract.deployFrom0xArtifactAsync(
                zeroExArtifacts.AvalancheBridgeAdapter,
                env.provider,
                env.txDefaults,
                zeroExArtifacts,
                constants.NULL_ADDRESS,
            );
        });
        it('sell sources', async () => {
            const sellSources = SELL_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Avalanche].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                sellSources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
        it('buy sources', async () => {
            const buySources = BUY_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Avalanche].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                buySources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
    });
    describe('BSC', () => {
        let adapter: BSCBridgeAdapterContract;
        before(async () => {
            adapter = await BSCBridgeAdapterContract.deployFrom0xArtifactAsync(
                zeroExArtifacts.BSCBridgeAdapter,
                env.provider,
                env.txDefaults,
                zeroExArtifacts,
                constants.NULL_ADDRESS,
            );
        });
        it('sell sources', async () => {
            const sellSources = SELL_SOURCE_FILTER_BY_CHAIN_ID[ChainId.BSC].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                sellSources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
        it('buy sources', async () => {
            const buySources = BUY_SOURCE_FILTER_BY_CHAIN_ID[ChainId.BSC].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                buySources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
    });
    describe('Celo', () => {
        let adapter: CeloBridgeAdapterContract;
        before(async () => {
            adapter = await CeloBridgeAdapterContract.deployFrom0xArtifactAsync(
                zeroExArtifacts.CeloBridgeAdapter,
                env.provider,
                env.txDefaults,
                zeroExArtifacts,
                constants.NULL_ADDRESS,
            );
        });
        it('sell sources', async () => {
            const sellSources = SELL_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Celo].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                sellSources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
        it('buy sources', async () => {
            const buySources = BUY_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Celo].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                buySources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
    });
    describe('Ethereum', () => {
        let adapter: EthereumBridgeAdapterContract;
        before(async () => {
            adapter = await EthereumBridgeAdapterContract.deployFrom0xArtifactAsync(
                zeroExArtifacts.EthereumBridgeAdapter,
                env.provider,
                env.txDefaults,
                zeroExArtifacts,
                constants.NULL_ADDRESS,
            );
        });
        it('sell sources', async () => {
            const sellSources = SELL_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Mainnet].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                sellSources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
        it('buy sources', async () => {
            const buySources = BUY_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Mainnet].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                buySources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
    });
    describe('Fantom', () => {
        let adapter: FantomBridgeAdapterContract;
        before(async () => {
            adapter = await FantomBridgeAdapterContract.deployFrom0xArtifactAsync(
                zeroExArtifacts.FantomBridgeAdapter,
                env.provider,
                env.txDefaults,
                zeroExArtifacts,
                constants.NULL_ADDRESS,
            );
        });
        it('sell sources', async () => {
            const sellSources = SELL_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Fantom].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                sellSources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
        it('buy sources', async () => {
            const buySources = BUY_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Fantom].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                buySources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
    });
    describe('Optimism', () => {
        let adapter: OptimismBridgeAdapterContract;
        before(async () => {
            adapter = await OptimismBridgeAdapterContract.deployFrom0xArtifactAsync(
                zeroExArtifacts.OptimismBridgeAdapter,
                env.provider,
                env.txDefaults,
                zeroExArtifacts,
                constants.NULL_ADDRESS,
            );
        });
        it('sell sources', async () => {
            const sellSources = SELL_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Optimism].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                sellSources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
        it('buy sources', async () => {
            const buySources = BUY_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Optimism].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                buySources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
    });
    describe('Polygon', () => {
        let adapter: PolygonBridgeAdapterContract;
        before(async () => {
            adapter = await PolygonBridgeAdapterContract.deployFrom0xArtifactAsync(
                zeroExArtifacts.PolygonBridgeAdapter,
                env.provider,
                env.txDefaults,
                zeroExArtifacts,
                constants.NULL_ADDRESS,
            );
        });
        it('sell sources', async () => {
            const sellSources = SELL_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Polygon].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                sellSources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
        it('buy sources', async () => {
            const buySources = BUY_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Polygon].exclude([
                ERC20BridgeSource.Native,
                ERC20BridgeSource.MultiHop,
            ]).sources;
            return Promise.all(
                buySources.map(async (source) => {
                    const isSupported = await adapter
                        .isSupportedSource(getErc20BridgeSourceToBridgeSource(source))
                        .callAsync();
                    expect(isSupported, `${source} is not supported`).to.be.true();
                }),
            );
        });
    });
});
