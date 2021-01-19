import { assetDataUtils } from '@0x/order-utils';
import { LimitOrderFields } from '@0x/protocol-utils';
import { AssetData, AssetProxyId, ERC20AssetData, ERC20BridgeAssetData, Order } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';

import { constants } from '../constants';
import { PriceAwareRFQFlags } from '../types';

// tslint:disable: no-unnecessary-type-assertion completed-docs

/**
 * Returns 2 flags (one for firm quotes and another for indicative quotes) that serve as rollout flags for the price-aware RFQ feature.
 * By default, indicative quotes should *always* go through the new price-aware flow. This means that all indicative RFQ requests made to
 * market makers will contain the new price-aware `suggestedPrice` field.
 * The `isPriceAwareRFQEnabled` feature object that is passed in by the 0x API will then control whether firm quotes go through price-aware RFQ.
 *
 * @param isPriceAwareRFQEnabled the feature flag that is passed in by the 0x API.
 */
export function getPriceAwareRFQRolloutFlags(priceAwareRFQFlags?: PriceAwareRFQFlags): PriceAwareRFQFlags {
    return priceAwareRFQFlags !== undefined
        ? priceAwareRFQFlags
        : {
              isFirmPriceAwareEnabled: false,
              isIndicativePriceAwareEnabled: false,
          };
}

export function numberPercentageToEtherTokenAmountPercentage(percentage: number): BigNumber {
    return Web3Wrapper.toBaseUnitAmount(constants.ONE_AMOUNT, constants.ETHER_TOKEN_DECIMALS).multipliedBy(percentage);
}

export function isOrderTakerFeePayableWithMakerAsset<T extends LimitOrderFields>(order: T): boolean {
    return !order.takerTokenFeeAmount.isZero() && isAssetDataEquivalent(order.takerFeeAssetData, order.makerAssetData);
}

export function isOrderTakerFeePayableWithTakerAsset<T extends LimitOrderFields>(order: T): boolean {
    return !order.takerTokenFeeAmount.isZero() && isAssetDataEquivalent(order.takerFeeAssetData, order.takerAssetData);
}

export function getAdjustedMakerAndTakerAmountsFromTakerFees<T extends Order>(order: T): [BigNumber, BigNumber] {
    const adjustedMakerAssetAmount = isOrderTakerFeePayableWithMakerAsset(order)
        ? order.makerAssetAmount.minus(order.takerFee)
        : order.makerAssetAmount;
    const adjustedTakerAssetAmount = isOrderTakerFeePayableWithTakerAsset(order)
        ? order.takerAssetAmount.plus(order.takerFee)
        : order.takerAssetAmount;
    return [adjustedMakerAssetAmount, adjustedTakerAssetAmount];
}

export function isERC20EquivalentAssetData(assetData: AssetData): assetData is ERC20AssetData | ERC20BridgeAssetData {
    return assetDataUtils.isERC20TokenAssetData(assetData) || assetDataUtils.isERC20BridgeAssetData(assetData);
}

export function getTokenFromAssetData(assetData: string): string {
    const data = assetDataUtils.decodeAssetDataOrThrow(assetData);
    if (data.assetProxyId !== AssetProxyId.ERC20 && data.assetProxyId !== AssetProxyId.ERC20Bridge) {
        throw new Error(`Unsupported exchange proxy quote asset type: ${data.assetProxyId}`);
    }
    // tslint:disable-next-line:no-unnecessary-type-assertion
    return (data as ERC20AssetData).tokenAddress;
}
