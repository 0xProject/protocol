import { BigNumber } from '@0x/utils';
import { BlockParamLiteral } from 'ethereum-types';
import { providers } from 'ethers';

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
 * @param gasEstimatePerTx the gas estimate for a transaction. If a chain supports different types of trades (for example, RFQm and metatxn),
 *                        this value should be the max gas estimate among different types.
 * @returns true if the metatransaction worker can pick up work.
 */
export async function isWorkerReadyAndAbleAsync(
    provider: providers.Provider,
    accountAddress: string,
    accountBalance: BigNumber,
    gasPriceBaseUnits: BigNumber,
    gasEstimatePerTx: number,
): Promise<boolean> {
    // Check worker has enough ETH to support 3 trades
    const minimumCostToTrade = gasPriceBaseUnits.times(gasEstimatePerTx).times(MIN_NUM_TRADES_FOR_HEALTHCHECK);
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
    const lastNonceOnChain = await provider.getTransactionCount(accountAddress);
    const lastNoncePending = await provider.getTransactionCount(accountAddress, BlockParamLiteral.Pending);
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