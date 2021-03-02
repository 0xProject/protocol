import { ContractAddresses, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { web3Factory, Web3ProviderEngine } from '@0x/dev-utils';
import { ETH_TOKEN_ADDRESS } from '@0x/protocol-utils';
import { ObjectMap } from '@0x/types';
import { BigNumber } from '@0x/utils';

export const ETHEREUM_RPC_URL = 'http://localhost:8545';
export const CHAIN_ID = 1337;
// tslint:disable-next-line:custom-no-magic-numbers
export const MAX_INT = new BigNumber(2).pow(256).minus(1);
export const MAX_MINT_AMOUNT = new BigNumber('10000000000000000000000');
export const CONTRACT_ADDRESSES: ContractAddresses = getContractAddressesForChainOrThrow(CHAIN_ID);
export { ETH_TOKEN_ADDRESS };
export const ZRX_TOKEN_ADDRESS = CONTRACT_ADDRESSES.zrxToken;
export const WETH_TOKEN_ADDRESS = CONTRACT_ADDRESSES.etherToken;
export const UNKNOWN_TOKEN_ADDRESS = '0xbe0037eaf2d64fe5529bca93c18c9702d3930376';
export const SYMBOL_TO_ADDRESS: ObjectMap<string> = {
    ZRX: ZRX_TOKEN_ADDRESS,
    WETH: WETH_TOKEN_ADDRESS,
    ETH: ETH_TOKEN_ADDRESS,
};
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const AFFILIATE_DATA_SELECTOR = '869584cd';

export const MATCHA_AFFILIATE_ADDRESS = '0x86003b044f70dac0abc80ac8957305b6370893ed';
export const MATCHA_AFFILIATE_ENCODED_PARTIAL_ORDER_DATA =
    '869584cd00000000000000000000000086003b044f70dac0abc80ac8957305b6370893ed0000000000000000000000000000000000000000000000';

const ganacheConfigs = {
    shouldUseInProcessGanache: false,
    shouldAllowUnlimitedContractSize: true,
    rpcUrl: ETHEREUM_RPC_URL, // set in docker-compose-test.yml
};

export const getProvider = (): Web3ProviderEngine => {
    return web3Factory.getRpcProvider(ganacheConfigs);
};
