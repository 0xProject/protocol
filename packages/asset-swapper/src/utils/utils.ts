import { assetDataUtils } from '@0x/order-utils';
import { LimitOrderFields } from '@0x/protocol-utils';
import { AssetData, AssetProxyId, ERC20AssetData, ERC20BridgeAssetData, Order, SignedOrder } from '@0x/types';
import { BigNumber, NULL_BYTES } from '@0x/utils';
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

export function isExactAssetData(expectedAssetData: string, actualAssetData: string): boolean {
    return expectedAssetData === actualAssetData;
}

/**
 * Compare the Asset Data for equivalency. Expected is the asset data the user provided (wanted),
 * actual is the asset data found or created.
 */
export function isAssetDataEquivalent(expectedAssetData: string, actualAssetData: string): boolean {
    if (isExactAssetData(expectedAssetData, actualAssetData)) {
        return true;
    }
    const decodedExpectedAssetData = assetDataUtils.decodeAssetDataOrThrow(expectedAssetData);
    const decodedActualAssetData = assetDataUtils.decodeAssetDataOrThrow(actualAssetData);
    // ERC20 === ERC20, ERC20 === ERC20Bridge
    if (isERC20EquivalentAssetData(decodedExpectedAssetData) && isERC20EquivalentAssetData(decodedActualAssetData)) {
        const doesTokenAddressMatch = decodedExpectedAssetData.tokenAddress === decodedActualAssetData.tokenAddress;
        return doesTokenAddressMatch;
    }
    // ERC1155 === ERC1155
    if (
        assetDataUtils.isERC1155TokenAssetData(decodedExpectedAssetData) &&
        assetDataUtils.isERC1155TokenAssetData(decodedActualAssetData)
    ) {
        const doesTokenAddressMatch = decodedExpectedAssetData.tokenAddress === decodedActualAssetData.tokenAddress;
        // IDs may be out of order yet still equivalent
        // i.e (["a", "b"], [1,2]) === (["b", "a"], [2, 1])
        //     (["a", "b"], [2,1]) !== (["b", "a"], [2, 1])
        const hasAllIds = decodedExpectedAssetData.tokenIds.every(
            id => decodedActualAssetData.tokenIds.findIndex(v => id.eq(v)) !== -1,
        );
        const hasAllValues = decodedExpectedAssetData.tokenIds.every((id, i) =>
            decodedExpectedAssetData.tokenValues[i].eq(
                decodedActualAssetData.tokenValues[decodedActualAssetData.tokenIds.findIndex(v => id.eq(v))],
            ),
        );
        // If expected contains callback data, ensure it is present
        // if actual has callbackdata and expected provided none then ignore it
        const hasEquivalentCallback =
            decodedExpectedAssetData.callbackData === NULL_BYTES ||
            decodedExpectedAssetData.callbackData === decodedActualAssetData.callbackData;
        return doesTokenAddressMatch && hasAllIds && hasAllValues && hasEquivalentCallback;
    }
    // ERC721 === ERC721
    if (
        assetDataUtils.isERC721TokenAssetData(decodedExpectedAssetData) ||
        assetDataUtils.isERC721TokenAssetData(decodedActualAssetData)
    ) {
        // Asset Data should exactly match for ERC721
        return isExactAssetData(expectedAssetData, actualAssetData);
    }

    // TODO(dekz): Unsupported cases
    // ERCXX(token) === MAP(token, staticCall)
    // MAP(a, b) === MAP(b, a) === MAP(b, a, staticCall)
    return false;
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
