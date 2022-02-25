import { RPCSubprovider, Web3ProviderEngine } from '@0x/subproviders';
import { providerUtils as ZeroExProviderUtils } from '@0x/utils';
import { BlockParamLiteral } from '@0x/web3-wrapper';
import _ = require('lodash');
import { inspect } from 'util';

import { artifacts } from '../artifacts';
import { CURVE_MAINNET_INFOS } from '../utils/market_operation_utils/constants';
import { CurveFunctionSelectors, CurveInfo } from '../utils/market_operation_utils/types';
import { CurvePoolFactoryReaderContract } from '../wrappers';

const PROVIDER = new Web3ProviderEngine();
PROVIDER.addProvider(new RPCSubprovider(process.env.ETHEREUM_RPC_URL!));
ZeroExProviderUtils.startProviderEngine(PROVIDER);

const QUERY_ADDRESS = '0x5555555555555555555555555555555555555555';
const overrides = {
    [QUERY_ADDRESS]: { code: _.get(artifacts.CurvePoolFactoryReader, 'compilerOutput.evm.deployedBytecode.object') },
};
const FACTORY_READER = new CurvePoolFactoryReaderContract(QUERY_ADDRESS, PROVIDER);

interface PoolBase {
    coins: string[];
    symbols: string[];
    pool: string;
    hasBalance: boolean;
    codeHash: string;
}

interface RegistryPool extends PoolBase {
    underlyingCoins: string[];
    underlyingSymbols: string[];
    isMeta: boolean;
}

const getCurveFactoryPools = async (address: string): Promise<Array<PoolBase>> => {
    const pools = await FACTORY_READER.getFactoryPools(address).callAsync({ overrides }, BlockParamLiteral.Latest);
    return pools;
};

const getCurveRegistryPools = async (address: string): Promise<Array<RegistryPool>> => {
    const pools = await FACTORY_READER.getRegistryPools(address).callAsync({ overrides }, BlockParamLiteral.Latest);
    return pools;
};

// Provides the address to the registry
// https://curve.readthedocs.io/registry-address-provider.html
const REGISTRY_ADDRESS_PROVIDER = '0x0000000022D53366457F9d5E68Ec105046FC4383';
// get_registry on the registryAddressProvider or also the 0th address in get_address
// 0: The main registry contract. Used to locate pools and query information about them.
const CURVE_REGISTRY = '0x90e00ace148ca3b23ac1bc8c240c2a7dd9c2d7f5'; // 42 pools
// 1: Aggregate getter methods for querying large data sets about a single pool. Designed for off-chain use.
// 2: Generalized swap contract. Used for finding rates and performing exchanges.
// 3: The metapool factory.
const CURVE_META_FACTORY = '0xb9fc157394af804a3578134a6585c0dc9cc990d4';
// 4: The fee distributor. Used to distribute collected fees to veCRV holders.
// 5: ? Some other registry 0x8F942C20D02bEfc377D41445793068908E2250D0, Curve V2?
const CURVE_V2_FACTORY = '0x8F942C20D02bEfc377D41445793068908E2250D0';
// 6: ? Crypto Factory, 20 pools
const CURVE_CRYPTO_FACTORY = '0xf18056bbd320e96a48e3fbf8bc061322531aac99';

const ETH = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

/* TODO
 * 
FEI-3Crv $109m
0x06cb22615BA53E60D67Bf6C341a0fD5E718E1655 is in META_FACTORY
but not in Registry 
 */

const normalizeCoins = (coins: string[]): string[] => coins.map(c => (c === ETH ? WETH : c));

const determineRegistryCurveInfos = (pool: Array<RegistryPool>): CurveInfo[] => {
    return pool.map(p => {
        const isUnderlying = p.underlyingCoins.length > 1 && !p.underlyingCoins.every(c => p.coins.includes(c));
        if (p.isMeta || isUnderlying) {
            // Meta indicates Stable + 3Crv
            // Typically that would be
            // coins [Stable, 3Crv]
            // underlyingCoins [Stable, DAI, USDC, USDT]
            const info: CurveInfo = {
                exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
                sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
                buyQuoteFunctionSelector: CurveFunctionSelectors.None,
                tokens: normalizeCoins(p.underlyingCoins),
                metaTokens: undefined,
                poolAddress: p.pool,
                gasSchedule: p.isMeta ? 300e3 : 600e3,
            };
            return info;
        } else {
            const info: CurveInfo = {
                exchangeFunctionSelector: CurveFunctionSelectors.exchange,
                sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
                buyQuoteFunctionSelector: CurveFunctionSelectors.None,
                tokens: normalizeCoins(p.coins),
                metaTokens: undefined,
                poolAddress: p.pool,
                gasSchedule: 200e3,
            };
            return info;
        }
    });
};

const determineFactoryCurveInfos = (pool: Array<RegistryPool>): CurveInfo[] => {
    return [];
};

// tslint:disable no-floating-promises
(async () => {
    try {
        // Appears to be 2 different factories, cryptoFactory pools looks like the latest and greatest
        const cryptoFactoryPools = await getCurveFactoryPools(CURVE_CRYPTO_FACTORY);
        const metaFactoryPools = await getCurveRegistryPools(CURVE_META_FACTORY);
        const v2FactoryPools = await getCurveFactoryPools(CURVE_V2_FACTORY);
        const registryPools = await getCurveRegistryPools(CURVE_REGISTRY);
        const factoryPools = [...cryptoFactoryPools, ...metaFactoryPools, ...v2FactoryPools, ...registryPools];
        // console.log(Object.values(CURVE_MAINNET_INFOS));
        // console.log('\n');
        console.log(determineRegistryCurveInfos(registryPools));

        const currentlyMappedAddresses = Object.values(CURVE_MAINNET_INFOS).map(info => info.poolAddress);

        const missingPools = _.chain(factoryPools)
            .filter(({ pool, hasBalance }) => !currentlyMappedAddresses.includes(pool) && hasBalance)
            .uniqBy('pool')
            .value();

        // tslint:disable no-console
        // console.log(inspect(_.groupBy(missingPools, 'codeHash'), { showHidden: false, depth: null, colors: true }));
        // console.log(`Found ${missingPools.length} missing pools`);
    } catch (e) {
        console.log(e);
        throw e;
    }
})();
