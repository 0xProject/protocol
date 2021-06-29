import { BigNumber } from '@0x/asset-swapper';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { BlockParamLiteral } from 'ethereum-types';

import { RFQM_TX_GAS_ESTIMATE } from '../constants';
import { logger } from '../logger';

const MIN_NUM_TRADES_FOR_HEALTHCHECK = 3;

/**
 * Returns true if the worker has a sufficient balance to trade
 * @param accountAddress the EOA address
 * @param accountBalance the EOA address balance
 * @param gasPriceBaseUnits fast gas price (wei)
 * @returns true if the worker has sufficient balance
 */
export function workerHasEnoughBalance(
    accountAddress: string,
    accountBalance: BigNumber,
    gasPriceBaseUnits: BigNumber,
): boolean {
    const minimumCostToTrade = gasPriceBaseUnits.times(RFQM_TX_GAS_ESTIMATE).times(MIN_NUM_TRADES_FOR_HEALTHCHECK);
    const hasEnoughBalance = accountBalance.gte(minimumCostToTrade);
    if (!hasEnoughBalance) {
        logger.error(
            {
                accountAddress,
                accountBalance: accountBalance.toString(),
                minimumCostToTrade: minimumCostToTrade.toString(),
                gasPriceBaseUnits: gasPriceBaseUnits.toString(),
            },
            'Worker does not have enough balance to trade.',
        );
    }
    return hasEnoughBalance;
}

async function workerHasNoPendingTransactionsAsync(accountAddress: string, wrapper: Web3Wrapper): Promise<boolean> {
    const lastNonceOnChain = await wrapper.getAccountNonceAsync(accountAddress);
    const lastNoncePending = await wrapper.getAccountNonceAsync(accountAddress, BlockParamLiteral.Pending);
    const hasNoPendingTransactions = lastNonceOnChain.toString() === lastNoncePending.toString();
    if (!hasNoPendingTransactions) {
        logger.error(
            {
                accountAddress,
                lastNonceOnChain: lastNonceOnChain.toString(),
                lastNoncePending: lastNoncePending.toString(),
            },
            'Worker has pending transactions and cannot trade.',
        );
    }
    return hasNoPendingTransactions;
}

/**
 * Returns true if a metatransaction worker is able to pick up new work. The function will also
 * emit logs if it was to find issues.
 * @param wrapper the Web3Wrapper instance
 * @param accountAddress the EOA address of the worker
 * @param gasPriceBaseUnits the current gas price
 * @returns true if the metatransaction worker can pick up work.
 */
export async function isWorkerReadyAndAbleAsync(
    wrapper: Web3Wrapper,
    accountAddress: string,
    accountBalance: BigNumber,
    gasPriceBaseUnits: BigNumber,
): Promise<boolean> {
    // Check worker has enough ETH to support 3 trades (small buffer)
    if (!workerHasEnoughBalance(accountAddress, accountBalance, gasPriceBaseUnits)) {
        return false;
    }
    return workerHasNoPendingTransactionsAsync(accountAddress, wrapper);
}
