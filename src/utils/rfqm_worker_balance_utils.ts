import { BigNumber } from '@0x/asset-swapper';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { BlockParamLiteral } from 'ethereum-types';

import { RFQM_TX_GAS_ESTIMATE } from '../constants';
import { logger } from '../logger';

const MIN_NUM_TRADES_FOR_HEALTHCHECK = 3;

/**
 * Returns true if a metatransaction worker is able to pick up new work, i.e. the
 * worker has enough balance to trade and has no pending transactions.
 *
 * The function will also emit logs if it was to find issues.
 *
 * @param wrapper the Web3Wrapper instance
 * @param accountAddress the EOA address of the worker
 * @param accountBalance the balance of the worker
 * @param gasPriceBaseUnits the current gas price
 * @returns true if the metatransaction worker can pick up work.
 */
export async function isWorkerReadyAndAbleAsync(
    wrapper: Web3Wrapper,
    accountAddress: string,
    accountBalance: BigNumber,
    gasPriceBaseUnits: BigNumber,
): Promise<boolean> {
    // Check worker has enough ETH to support 3 trades
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
    if (!hasEnoughBalance) {
        return false;
    }

    // check worker has no pending transactions
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
