import { GanacheSubprovider, RPCSubprovider, Web3ProviderEngine } from '@0x/subproviders';
import { providerUtils } from '@0x/utils';
import * as fs from 'fs';

import { constants } from './constants';
import { env, EnvVars } from './env';

interface Web3Config {
    total_accounts?: number; // default: 10
    shouldUseInProcessGanache?: boolean; // default: false
    shouldThrowErrorsOnGanacheRPCResponse?: boolean; // default: true
    rpcUrl?: string; // default: localhost:8545
    ganacheDatabasePath?: string; // default: undefined, creates a tmp dir
    shouldAllowUnlimitedContractSize?: boolean;
    fork?: string;
    blockTime?: number;
    locked?: boolean;
    unlocked_accounts?: string[];
    hardfork?: string; // default: istanbul
    gasLimit?: number;
    chainId?: number; // default: 1337
}

/**
 * @deprecated
 */
export const web3Factory = {
    getRpcProvider(config: Web3Config = {}): Web3ProviderEngine {
        const provider = new Web3ProviderEngine();

        const logger = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            log: (arg: any) => {
                fs.appendFileSync('ganache.log', `${arg}\n`);
            },
        };
        const shouldUseInProcessGanache = !!config.shouldUseInProcessGanache;
        if (shouldUseInProcessGanache) {
            if (config.rpcUrl !== undefined) {
                throw new Error('Cannot use both GanacheSubprovider and RPCSubprovider');
            }

            if (config.ganacheDatabasePath !== undefined) {
                const doesDatabaseAlreadyExist = fs.existsSync(config.ganacheDatabasePath);
                if (!doesDatabaseAlreadyExist) {
                    // Working with local DB snapshot. Ganache requires this directory to exist
                    fs.mkdirSync(config.ganacheDatabasePath);
                }
            }

            const shouldThrowErrorsOnGanacheRPCResponse =
                config.shouldThrowErrorsOnGanacheRPCResponse === undefined ||
                config.shouldThrowErrorsOnGanacheRPCResponse;
            provider.addProvider(
                new GanacheSubprovider({
                    total_accounts: config.total_accounts,
                    vmErrorsOnRPCResponse: shouldThrowErrorsOnGanacheRPCResponse,
                    db_path: config.ganacheDatabasePath,
                    allowUnlimitedContractSize: config.shouldAllowUnlimitedContractSize,
                    gasLimit: config.gasLimit || constants.GAS_LIMIT,
                    logger,
                    verbose: env.parseBoolean(EnvVars.VerboseGanache),
                    port: 8545,
                    network_id: config.chainId === undefined ? 1337 : config.chainId,
                    _chainId: config.chainId === undefined ? 1337 : config.chainId,
                    mnemonic: 'concert load couple harbor equip island argue ramp clarify fence smart topic',
                    fork: config.fork,
                    blockTime: config.blockTime,
                    locked: config.locked,
                    unlocked_accounts: config.unlocked_accounts,
                    hardfork: config.hardfork || 'istanbul',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any), // TODO remove any once types are merged in DefinitelyTyped
            );
        } else {
            provider.addProvider(new RPCSubprovider(config.rpcUrl || constants.RPC_URL));
        }
        providerUtils.startProviderEngine(provider);
        return provider;
    },
};
