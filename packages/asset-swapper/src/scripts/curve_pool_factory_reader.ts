import { RPCSubprovider, Web3ProviderEngine } from '@0x/subproviders';
import { providerUtils as ZeroExProviderUtils } from '@0x/utils';
import { BlockParamLiteral } from '@0x/web3-wrapper';
import _ = require('lodash');
import { artifacts } from '../artifacts';
import { CURVE_MAINNET_INFOS } from '../utils/market_operation_utils/constants';
import { CurvePoolFactoryReaderContract } from '../wrappers';

const PROVIDER = new Web3ProviderEngine();
PROVIDER.addProvider(new RPCSubprovider(process.env.ETHEREUM_RPC_URL!));
ZeroExProviderUtils.startProviderEngine(PROVIDER);

const QUERY_ADDRESS = '0x5555555555555555555555555555555555555555';
const overrides = {
    [QUERY_ADDRESS]: { code: _.get(artifacts.CurvePoolFactoryReader, 'compilerOutput.evm.deployedBytecode.object') },
};
const FACTORY_READER = new CurvePoolFactoryReaderContract(QUERY_ADDRESS, PROVIDER);

const getCurveCryptoFactoryPools = async (
    address: string,
): Promise<{
    coins: string[];
    symbols: string[];
    pool: string;
    hasBalance: boolean;
}[]> => {
    const pools = await FACTORY_READER.getCryptoFactoryPools(address).callAsync(
        { overrides },
        BlockParamLiteral.Latest,
    );
    return pools;
};

const CURVE_CRYPTO_FACTORY = '0xf18056bbd320e96a48e3fbf8bc061322531aac99';
const CURVE_META_FACTORY = '0xb9fc157394af804a3578134a6585c0dc9cc990d4';

(async () => {
    try {
        const factoryPools = await getCurveCryptoFactoryPools(CURVE_META_FACTORY);
        const mappedAddresses = Object.values(CURVE_MAINNET_INFOS).map(info => info.poolAddress);
        const missingPools = factoryPools.filter(pool => {
            return !mappedAddresses.includes(pool.pool) && pool.hasBalance;
        });
        console.log(missingPools);
    } catch (e) {
        console.log(e);
        throw e;
    }
})();
