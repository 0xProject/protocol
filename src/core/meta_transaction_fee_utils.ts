import { BigNumber } from '@0x/utils';
import { ZeroExFeeConfiguration, ZERO_EX_FEE_CONFIGURATION_MAP } from '../config';
import { toPairString } from './pair_utils';
import {
    FeeConfigs,
    Fees,
    GasFee,
    GasFeeConfig,
    IntegratorShareFee,
    IntegratorShareFeeConfig,
    RawFees,
    TruncatedFee,
    TruncatedFees,
    VolumeBasedFee,
    VolumeBasedFeeConfig,
} from './types/meta_transaction_fees';

export function rawFeesToFees(rawFees: RawFees | undefined): Fees | undefined {
    if (!rawFees) {
        return undefined;
    }

    let integratorFee: VolumeBasedFee | undefined;
    if (rawFees.integratorFee) {
        const rawIntegratorFee = rawFees.integratorFee;

        integratorFee = {
            type: 'volume',
            feeToken: rawIntegratorFee.feeToken,
            feeAmount: new BigNumber(rawIntegratorFee.feeAmount),
            billingType: rawIntegratorFee.billingType,
            feeRecipient: rawFees.integratorFee.feeRecipient,
            volumePercentage: new BigNumber(rawFees.integratorFee.volumePercentage),
        };
    }

    let zeroExFee: VolumeBasedFee | IntegratorShareFee | undefined;
    if (rawFees.zeroExFee) {
        const rawZeroExFee = rawFees.zeroExFee;

        if (rawZeroExFee.type === 'volume') {
            zeroExFee = {
                type: 'volume',
                feeToken: rawZeroExFee.feeToken,
                feeAmount: new BigNumber(rawZeroExFee.feeAmount),
                billingType: rawZeroExFee.billingType,
                feeRecipient: rawZeroExFee.feeRecipient,
                volumePercentage: new BigNumber(rawZeroExFee.volumePercentage),
            };
        } else if (rawZeroExFee.type === 'integrator_share') {
            zeroExFee = {
                type: 'integrator_share',
                feeToken: rawZeroExFee.feeToken,
                feeAmount: new BigNumber(rawZeroExFee.feeAmount),
                billingType: rawZeroExFee.billingType,
                feeRecipient: rawZeroExFee.feeRecipient,
                integratorSharePercentage: new BigNumber(rawZeroExFee.integratorSharePercentage),
            };
        }
    }

    let gasFee: GasFee | undefined;
    if (rawFees.gasFee) {
        const rawGasFee = rawFees.gasFee;

        gasFee = {
            type: 'gas',
            feeToken: rawGasFee.feeToken,
            feeAmount: new BigNumber(rawGasFee.feeAmount),
            feeRecipient: rawGasFee.feeRecipient,
            billingType: rawGasFee.billingType,
            gasPrice: new BigNumber(rawGasFee.gasPrice),
            estimatedGas: new BigNumber(rawGasFee.estimatedGas),
            feeTokenAmountPerBaseUnitNativeToken: new BigNumber(rawGasFee.feeTokenAmountPerBaseUnitNativeToken),
        };
    }

    return {
        integratorFee,
        zeroExFee,
        gasFee,
    };
}

/**
 * Convert `Fees` to `TruncatedFees` which is returned in the payload to callers.
 */
export function feesToTruncatedFees(fees: Fees | undefined): TruncatedFees | undefined {
    if (!fees) {
        return undefined;
    }

    let integratorFee: TruncatedFee | undefined;
    let zeroExFee: TruncatedFee | undefined;
    let gasFee: TruncatedFee | undefined;

    if (fees.integratorFee) {
        const { type, feeToken, feeAmount } = fees.integratorFee;
        integratorFee = {
            feeType: type,
            feeToken,
            feeAmount,
        };
    }
    if (fees.zeroExFee) {
        const { type, feeToken, feeAmount } = fees.zeroExFee;
        zeroExFee = {
            feeType: type,
            feeToken,
            feeAmount,
        };
    }
    if (fees.gasFee) {
        const { type, feeToken, feeAmount } = fees.gasFee;
        gasFee = {
            feeType: type,
            feeToken,
            feeAmount,
        };
    }

    return {
        integratorFee,
        zeroExFee,
        gasFee,
    };
}

export function getFeeConfigsFromParams(params: {
    integratorId: string;
    chainId: number;
    sellToken: string;
    buyToken: string;
    integratorFeeConfig?: {
        type: 'volume'; // `feeType` field in `FetchQuoteParamsBase`
        recipient: string; // `feeRecipient` field in `FetchQuoteParamsBase`
        billingType: 'on-chain' | 'off-chain';
        sellTokenPercentage: BigNumber; // `feeSellTokenPercentage` field in `FetchQuoteParamsBase`
    };
}): FeeConfigs {
    let integratorFee: VolumeBasedFeeConfig | undefined;
    let zeroExFee: VolumeBasedFeeConfig | IntegratorShareFeeConfig | undefined;
    let gasFee: GasFeeConfig | undefined;

    if (params.integratorFeeConfig) {
        integratorFee = {
            type: params.integratorFeeConfig.type,
            feeRecipient: params.integratorFeeConfig.recipient,
            billingType: params.integratorFeeConfig.billingType,
            volumePercentage: params.integratorFeeConfig.sellTokenPercentage,
        };
    }

    // If integrator id has an entry, use integrator id as key to get fee config. Otherwise, use wildcard.
    const feeConfigurationByChainId = ZERO_EX_FEE_CONFIGURATION_MAP.get(params.integratorId)
        ? ZERO_EX_FEE_CONFIGURATION_MAP.get(params.integratorId)
        : ZERO_EX_FEE_CONFIGURATION_MAP.get('*');
    if (feeConfigurationByChainId) {
        const feeConfiguration = feeConfigurationByChainId.get(params.chainId);
        if (feeConfiguration) {
            zeroExFee = getZeroExFeeConfig(feeConfiguration, params.sellToken, params.buyToken);
            gasFee = {
                type: 'gas',
                feeRecipient: feeConfiguration.gas.feeRecipient,
                billingType: feeConfiguration.gas.billingType,
            };
        }
    }

    return {
        integratorFee,
        zeroExFee,
        gasFee,
    };
}

/**
 * Get 0x fee config from `ZeroExFeeConfiguration` object given sell and buy tokens. The function would match sell and buy tokens based on the following precedence:
 * 1. Specific pair
 * 2. Cartesian product
 * 3. Token
 *
 * For example, if `feeConfiguration` is the following:
 * {
 *      name: 'Coinbase',
 *      feeOn: 'volume',
 *      zeroExFeeRecipient: '0x123456...',
 *      gasFeeRecipient: '0x654321...',
 *      pairsFeeEntries:  { // Map
 *          // This means for USDC <-> WETH pair 0x charge 0.5% sell token as fee
 *          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48-0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 0.5,
 *          // This means for USDT <-> WETH pair 0x charge 0.5% sell token as fee
 *          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2-0xdac17f958d2ee523a2206206994597c13d831ec7': 0.5,
 *      },
 *      cartesianProductFeeEntries: [{
 *          // Set consists of USDC, USDT and DAI
 *          setA: { '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0xdac17f958d2ee523a2206206994597c13d831ec7', '0x6b175474e89094c44da98b954eedeac495271d0f' }
 *          // Set consists of WETH and WBTC
 *          setB: { '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599' }
 *          // This means for any combination between `setA` and `setB`, 0x charge 0.7% sell token as fee
 *          parameter: 0.7,
 *      }], [{
 *          // Set consists of USDC, USDT and DAI
 *          setA: { '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0xdac17f958d2ee523a2206206994597c13d831ec7', '0x6b175474e89094c44da98b954eedeac495271d0f' }
 *          // Set consists of USDC, USDT and DAI
 *          setB: { '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0xdac17f958d2ee523a2206206994597c13d831ec7', '0x6b175474e89094c44da98b954eedeac495271d0f' }
 *          // This means for any combination between `setA` and `setB`, 0x charge 0.1% sell token as fee
 *          parameter: 0.1,
 *      }],
 *      tokensEntries: { // Map
 *          // This means 0x charges 1.5% as fee if sell / buy token is WBTC
 *          '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 1.5, // WBTC
 *          // This means 0x charges all other sell tokens 0.05% as fee
 *          '*': 0.05,
 *      }
 * }
 *
 * With this example,
 * - if `sellToken` is 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 (USDC) and `buyToken` is 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 (WETH), there is a pair matches,
 *   the fee percentage would be 0.5
 * - if `sellToken` is 0x6b175474e89094c44da98b954eedeac495271d0f (DAI) and `buyToken` is 0x2260fac5e5542a773aa44fbcfedf7c193bc2c599 (WBTC), there is no pair matches but
 *   a cartesian product match, the fee percentage would be 0.7
 * - if `sellToken` is 0x2260fac5e5542a773aa44fbcfedf7c193bc2c599 (WBTC) and `buyToken` is 0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce (SHIB), there is no pair matches,
 *   no cartesian product match but a token match, the fee percentage would be 1.5%
 * - if `sellToken` is 0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce (SHIB) and `buyToken` is 0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9 (AAVE), there is no pair matches,
 *   no cartesian product match, no exact token match but wildcard, the fee percentage would be 0.05%
 *
 * @param feeConfiguration Correponding fee configuration for an integrator and chain id.
 * @param sellToken Address of the sell token.
 * @param buyToken Address of the buy token.
 * @returns 0x fee config
 */
function getZeroExFeeConfig(
    feeConfiguration: ZeroExFeeConfiguration,
    sellToken: string,
    buyToken: string,
): VolumeBasedFeeConfig | IntegratorShareFeeConfig | undefined {
    const [sellTokenLowerCase, buyTokenLowerCase] = [sellToken, buyToken].map((token) => token.toLowerCase());
    const pairString = toPairString(sellTokenLowerCase, buyTokenLowerCase);

    // specific pair has the highest precedence
    const pairFeeParameter = feeConfiguration.pairsFeeEntries.get(pairString);
    if (pairFeeParameter) {
        // pair fee config exists
        if (feeConfiguration.feeOn === 'volume') {
            return {
                type: 'volume',
                feeRecipient: feeConfiguration.zeroEx.feeRecipient,
                billingType: feeConfiguration.zeroEx.billingType,
                volumePercentage: pairFeeParameter,
            };
        } else if (feeConfiguration.feeOn === 'integrator_share') {
            return {
                type: 'integrator_share',
                feeRecipient: feeConfiguration.zeroEx.feeRecipient,
                billingType: feeConfiguration.zeroEx.billingType,
                integratorSharePercentage: pairFeeParameter,
            };
        }
    }

    // cartesian product has the second precedence
    for (const cartesianProductFeeEntry of feeConfiguration.cartesianProductFeeEntries) {
        if (
            (cartesianProductFeeEntry.setA.has(sellTokenLowerCase) &&
                cartesianProductFeeEntry.setB.has(buyTokenLowerCase)) ||
            (cartesianProductFeeEntry.setA.has(buyTokenLowerCase) &&
                cartesianProductFeeEntry.setB.has(sellTokenLowerCase))
        ) {
            // cartesian product config exists
            if (feeConfiguration.feeOn === 'volume') {
                return {
                    type: 'volume',
                    feeRecipient: feeConfiguration.zeroEx.feeRecipient,
                    billingType: feeConfiguration.zeroEx.billingType,
                    volumePercentage: cartesianProductFeeEntry.parameter,
                };
            } else if (feeConfiguration.feeOn === 'integrator_share') {
                return {
                    type: 'integrator_share',
                    feeRecipient: feeConfiguration.zeroEx.feeRecipient,
                    billingType: feeConfiguration.zeroEx.billingType,
                    integratorSharePercentage: cartesianProductFeeEntry.parameter,
                };
            }
        }
    }

    // If sell/buy token has an entry, use sell/buy token as key to get fee config. Otherwise, use wildcard.
    let tokenFeeParameter: BigNumber | undefined;
    if (feeConfiguration.tokensEntries.get(sellTokenLowerCase)) {
        tokenFeeParameter = feeConfiguration.tokensEntries.get(sellTokenLowerCase);
    } else if (feeConfiguration.tokensEntries.get(buyTokenLowerCase)) {
        tokenFeeParameter = feeConfiguration.tokensEntries.get(buyTokenLowerCase);
    } else {
        tokenFeeParameter = feeConfiguration.tokensEntries.get('*');
    }

    // Tokens has the lowest precedence
    if (tokenFeeParameter) {
        // find a match
        if (feeConfiguration.feeOn === 'volume') {
            return {
                type: 'volume',
                feeRecipient: feeConfiguration.zeroEx.feeRecipient,
                billingType: feeConfiguration.zeroEx.billingType,
                volumePercentage: tokenFeeParameter,
            };
        } else if (feeConfiguration.feeOn === 'integrator_share') {
            return {
                type: 'integrator_share',
                feeRecipient: feeConfiguration.zeroEx.feeRecipient,
                billingType: feeConfiguration.zeroEx.billingType,
                integratorSharePercentage: tokenFeeParameter,
            };
        }
    }

    return undefined;
}
