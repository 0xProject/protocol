import { IZeroExContract } from '@0x/contracts-zero-ex';
import { CallData } from '@0x/dev-utils';
import { MetaTransaction, RfqOrder, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { NULL_ADDRESS, ZERO } from '../constants';
import { ChainId } from '../types';

// allow a wide range for gas price for flexibility
const MIN_GAS_PRICE = new BigNumber(0);
// 10K Gwei
const MAX_GAS_PRICE = new BigNumber(1e13);

export class RfqBlockchainUtils {
    constructor(private readonly _exchangeProxy: IZeroExContract) {}

    // for use when 0x API operator submits an order on-chain on behalf of taker
    public generateMetaTransaction(
        rfqOrder: RfqOrder,
        signature: Signature,
        taker: string,
        takerAmount: BigNumber,
        chainId: ChainId,
    ): MetaTransaction {
        // generate call data for fillRfqOrder
        const callData = this._exchangeProxy
            .fillRfqOrder(rfqOrder, signature, takerAmount)
            .getABIEncodedTransactionData();

        return new MetaTransaction({
            signer: taker,
            sender: NULL_ADDRESS,
            minGasPrice: MIN_GAS_PRICE,
            maxGasPrice: MAX_GAS_PRICE,
            expirationTimeSeconds: rfqOrder.expiry,
            salt: new BigNumber(Date.now()),
            callData,
            value: ZERO,
            feeToken: NULL_ADDRESS,
            feeAmount: ZERO,
            chainId,
            verifyingContract: this._exchangeProxy.address,
        });
    }

    public async validateMetaTransactionOrThrowAsync(
        metaTx: MetaTransaction,
        metaTxSig: Signature,
        sender: string,
        txOptions?: Partial<CallData>,
    ): Promise<[BigNumber, BigNumber]> {
        try {
            const results = await this._exchangeProxy
                .executeMetaTransaction(metaTx, metaTxSig)
                .callAsync({ from: sender, ...txOptions });
            // returns [takerTokenFilledAmount, makerTokenFilledAmount]
            return this._exchangeProxy.getABIDecodedReturnData('fillRfqOrder', results);
        } catch (err) {
            throw new Error(err);
        }
    }

    public generateMetaTransactionCallData(metaTx: MetaTransaction, metaTxSig: Signature): string {
        return this._exchangeProxy.executeMetaTransaction(metaTx, metaTxSig).getABIEncodedTransactionData();
    }
}
