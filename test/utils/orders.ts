// tslint:disable:custom-no-magic-numbers
import { LimitOrderFields, SignatureType, SupportedProvider } from '@0x/asset-swapper';
import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { getRandomInteger, randomAddress } from '@0x/contracts-test-utils';
import { LimitOrder } from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import * as _ from 'lodash';

import { ZERO } from '../../src/constants';
import { SignedLimitOrder } from '../../src/types';
import { CHAIN_ID, NULL_ADDRESS, WETH_TOKEN_ADDRESS, ZRX_TOKEN_ADDRESS } from '../constants';

/**
 * Creates a random signed limit order from the provided fields
 */
export async function getRandomSignedLimitOrderAsync(
    provider: SupportedProvider,
    fields: Partial<LimitOrderFields> = {},
): Promise<SignedLimitOrder> {
    const limitOrder = getRandomLimitOrder(fields);
    const signature = await limitOrder.getSignatureWithProviderAsync(provider, SignatureType.EIP712);

    return {
        ...limitOrder,
        signature,
    };
}

/**
 * Creates a random unsigned limit order from the provided fields
 */
export function getRandomLimitOrder(fields: Partial<LimitOrderFields> = {}): LimitOrder {
    return new LimitOrder({
        // Default opts
        makerToken: ZRX_TOKEN_ADDRESS,
        takerToken: WETH_TOKEN_ADDRESS,
        makerAmount: getRandomInteger('100e18', '1000e18'),
        takerAmount: getRandomInteger('100e18', '1000e18'),
        takerTokenFeeAmount: ZERO,
        maker: randomAddress(),
        taker: NULL_ADDRESS, // NOTE: Open limit orders should allow any taker address
        sender: NULL_ADDRESS, // NOTE: the exchange proxy contract only support NULL address sender
        feeRecipient: NULL_ADDRESS,
        expiry: new BigNumber(2524604400), // Close to infinite
        salt: new BigNumber(hexUtils.random()),
        chainId: CHAIN_ID,
        verifyingContract: getContractAddressesForChainOrThrow(CHAIN_ID).exchangeProxy,
        ...fields,
    });
}
