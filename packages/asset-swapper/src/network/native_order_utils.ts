import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { LimitOrderFields } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { SignedNativeOrder } from '../types';
import { NativeOrderUtilsContract } from '../wrappers';

import { Chain } from './chain';
import { Address } from './types';
import { ContractHelper, createContractWrapperAndHelper } from './utils';

export class NativeOrderUtils {
    public readonly exchangeProxyAddress: Address;
    private readonly _nativeOrderUtilsContractHelper: ContractHelper<NativeOrderUtilsContract>;
    private readonly _nativeOrderUtilsContract: NativeOrderUtilsContract;

    constructor(public readonly chain: Chain) {
        [this._nativeOrderUtilsContract, this._nativeOrderUtilsContractHelper] = createContractWrapperAndHelper(
            chain,
            NativeOrderUtilsContract,
            'NativeOrderUtils',
        );
        this.exchangeProxyAddress = getContractAddressesForChainOrThrow(chain.chainId).exchangeProxy;
    }

    public async getLimitOrderFillableTakerAmountsAsync(orders: SignedNativeOrder[]): Promise<BigNumber[]> {
        return this._nativeOrderUtilsContractHelper.ethCallAsync(
            this._nativeOrderUtilsContract.getLimitOrderFillableTakerAssetAmounts,
            [orders.map(o => o.order as LimitOrderFields), orders.map(o => o.signature), this.exchangeProxyAddress],
            { gas: orders.length * 300e3 },
        );
    }

    public async getLimitOrderFillableMakerAmountsAsync(orders: SignedNativeOrder[]): Promise<BigNumber[]> {
        return this._nativeOrderUtilsContractHelper.ethCallAsync(
            this._nativeOrderUtilsContract.getLimitOrderFillableMakerAssetAmounts,
            [orders.map(o => o.order as LimitOrderFields), orders.map(o => o.signature), this.exchangeProxyAddress],
            { gas: orders.length * 300e3 },
        );
    }
}
