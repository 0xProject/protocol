import { devConstants, env, EnvVars, Web3Config, web3Factory } from '@0x/dev-utils';
import { Web3ProviderEngine } from '@0x/subproviders';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as _ from 'lodash';

import { constants } from './constants';

export const txDefaults = {
    from: devConstants.TESTRPC_FIRST_ADDRESS,
    gas: devConstants.GAS_LIMIT,
    gasPrice: constants.DEFAULT_GAS_PRICE,
};

export const providerConfigs: Web3Config = {
    total_accounts: constants.NUM_TEST_ACCOUNTS,
    shouldUseInProcessGanache: true,
    shouldAllowUnlimitedContractSize: true,
    hardfork: 'istanbul',
    gasLimit: 100e6,
    unlocked_accounts: [
        '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b',
        '0x55dc8f21d20d4c6ed3c82916a438a413ca68e335',
        '0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0', // ERC20BridgeProxy
        '0xf977814e90da44bfa03b6295a0616a897441acec', // Binance: USDC, TUSD
    ],
};

export const provider: Web3ProviderEngine = web3Factory.getRpcProvider(providerConfigs);
provider.stop();
const isCoverageEnabled = env.parseBoolean(EnvVars.SolidityCoverage);
const enabledSubproviderCount = _.filter([isCoverageEnabled], _.identity.bind(_)).length;
if (enabledSubproviderCount > 1) {
    throw new Error(`Only one of profiler or revert trace subproviders can be enabled at a time`);
}

export const web3Wrapper = new Web3Wrapper(provider);
