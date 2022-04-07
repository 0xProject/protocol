import { BigNumber } from '@0x/utils';

import { SubmissionContext } from './SubmissionContext';

export type Wei = BigNumber;
export type WeiPerGas = BigNumber;

//             __________________________________________
//           |             0X INC PUMP & DUMP           |'-._ _______
//           |__________________________________________|    '-.__.-'|
//             '-._______________________________________'-.___.    |
//                 | ||      .##.                        | ||
//   "     "     " | || "  ".#  #_________ "  "  ___ "  "| || "   "   "
//     "    "  "  "| ||"  " #  /*_______ /| "   /__/| "  | ||" "    "
// "     "   "  "  | || "   # | 420.00$ | |"  "|   ||" " | ||   "  "  "
// ================| ||=====#=|_________|/=====|___|/====| ||============
//                 | ||     #   |     | |       | ||     | ||
//           .-----| ||-----#--f|     | |-------| ||-----| ||----.
//          :      |_|/     '##'|_____|/        |_|/     |_|/     :
//         :___________________________________________________.':
//        '----------------------------------------------------'
//
// --------------------------------------------------------------------
// "   "      "      "   "   "   "  "    "  "    "   "     "     "  "
// "   "  "    " "  "   "       "  "   "    "  "  "      "  "    "
// "  "  "   "   "    "    "   "    "    "  "  " "    "   "  "  "

/**
 * The Gas Station Attendant has answers to all questions related
 * to gas prices on a blockchain.
 *
 * The attendant estimates the cost of a transaction, tells workers
 * how much gas they need to take a job, provides data for the health
 * check system, and implements a resubmission bidding strategy.
 *
 * An attendant can be built per blockchain, or we could even
 * have two for a blockchain to try new submission strategies.
 */
export interface GasStationAttendant {
    /**
     * Given a current set of transaction submissions for a job,
     * compute the gas rate bid for the next resubmission.
     *
     * Call with a `null` submission context to get a bid for the
     * first transaction.
     *
     * Attendants for EIP-1559 chains return `maxFeePerGas` and
     * `maxPriorityFeePerGas`, while attendants for type 0 only chains
     * return `maxGasPrice`.
     *
     * Returns `null` if there should not be another resubmission.
     */
    getNextBidAsync: (
        submissionContext: SubmissionContext<any> | null,
    ) => Promise<{ maxFeePerGas: BigNumber; maxPriorityFeePerGas: BigNumber } | { maxGasPrice: BigNumber } | null>;

    /**
     * Returns the expected gas rate (WEI/GAS) we will pay for a transaction
     * we submit now. Based on the current gas conditions; can integrate
     * historical data in the prediction.
     *
     * This can be used to compute the gas cost of a trade we quote
     * to the market maker.
     */
    getExpectedTransactionGasRateAsync: () => Promise<WeiPerGas>;

    /**
     * Returns a worst-case estimate for the total wei paid for
     * an RFQM transaction. This value is used for system
     * monitoring and alerting. The value should be calculated
     * independent of current gas conditions -- ~1 Month historical
     * lookback is more appropriate.
     *
     * See
     * https://0xproject.quip.com/qZdFAHLpT7JI/RFQm-healthz-System-Health-Endpoint#temp:C:cXH5851e0f15e8c4828bffc1339d
     * for pertinent analysis.
     */
    getSafeBalanceForTradeAsync: () => Promise<Wei>;

    /**
     * Returns the minimum amount of native token needed by a worker
     * to accept a new Job. This gets called before a specific Job
     * is selected, so the gas amount of the transaction must be estimated.
     */
    getWorkerBalanceForTradeAsync: () => Promise<Wei>;
}
