import { assert } from '@0x/assert';
import { schemas } from '@0x/json-schemas';
import {
    EIP712DomainWithDefaultSchema,
    EIP712Object,
    EIP712TypedData,
    EIP712Types,
    ExchangeProxyMetaTransaction,
    Order,
    SignedZeroExTransaction,
    ZeroExTransaction,
} from '@0x/types';
import { BigNumber, hexUtils, signTypedDataUtils } from '@0x/utils';
import * as _ from 'lodash';

import { constants } from './constants';

export const eip712Utils = {
    /**
     * Creates a EIP712TypedData object specific to the 0x protocol for use with signTypedData.
     * @param   primaryType The primary type found in message
     * @param   types The additional types for the data in message
     * @param   message The contents of the message
     * @param   domain Domain containing a name (optional), version (optional), and verifying contract address
     * @return  A typed data object
     */
    createTypedData: (
        primaryType: string,
        types: EIP712Types,
        message: EIP712Object,
        domain: EIP712DomainWithDefaultSchema,
    ): EIP712TypedData => {
        assert.isETHAddressHex('verifyingContract', domain.verifyingContract);
        assert.isString('primaryType', primaryType);
        const typedData = {
            types: {
                EIP712Domain: constants.DEFAULT_DOMAIN_SCHEMA.parameters,
                ...types,
            },
            domain: {
                name: domain.name === undefined ? constants.EXCHANGE_DOMAIN_NAME : domain.name,
                version: domain.version === undefined ? constants.EXCHANGE_DOMAIN_VERSION : domain.version,
                chainId: domain.chainId,
                verifyingContract: domain.verifyingContract,
            },
            message,
            primaryType,
        };
        assert.doesConformToSchema('typedData', typedData, schemas.eip712TypedDataSchema);
        return typedData;
    },
    /**
     * Creates an Order EIP712TypedData object for use with signTypedData.
     * @param   Order the order
     * @return  A typed data object
     */
    createOrderTypedData: (order: Order): EIP712TypedData => {
        assert.doesConformToSchema('order', order, schemas.orderSchema, [schemas.hexSchema]);
        const normalizedOrder = _.mapValues(order, value => {
            return !_.isString(value) ? value.toString() : value;
        });
        const partialDomain = {
            chainId: order.chainId,
            verifyingContract: order.exchangeAddress,
        };
        // Since we are passing in the EXCHANGE_ORDER_SCHEMA
        // order paramaters that are not in there get ignored at hashing time
        const typedData = eip712Utils.createTypedData(
            constants.EXCHANGE_ORDER_SCHEMA.name,
            { Order: constants.EXCHANGE_ORDER_SCHEMA.parameters },
            normalizedOrder,
            partialDomain,
        );
        return typedData;
    },
    /**
     * Creates an ExecuteTransaction EIP712TypedData object for use with signTypedData and
     * 0x Exchange executeTransaction.
     * @param   zeroExTransaction the 0x transaction
     * @return  A typed data object
     */
    createZeroExTransactionTypedData: (zeroExTransaction: ZeroExTransaction): EIP712TypedData => {
        assert.isNumber('domain.chainId', zeroExTransaction.domain.chainId);
        assert.isETHAddressHex('domain.verifyingContract', zeroExTransaction.domain.verifyingContract);
        assert.doesConformToSchema('zeroExTransaction', zeroExTransaction, schemas.zeroExTransactionSchema);
        const normalizedTransaction = _.mapValues(zeroExTransaction, value => {
            return !_.isString(value) ? value.toString() : value;
        });
        const typedData = eip712Utils.createTypedData(
            constants.EXCHANGE_ZEROEX_TRANSACTION_SCHEMA.name,
            { ZeroExTransaction: constants.EXCHANGE_ZEROEX_TRANSACTION_SCHEMA.parameters },
            normalizedTransaction,
            zeroExTransaction.domain,
        );
        return typedData;
    },
    /**
     * Creates an Coordinator typedData EIP712TypedData object for use with the Coordinator extension contract
     * @param   transaction A 0x transaction
     * @param   verifyingContract The coordinator extension contract address that will be verifying the typedData
     * @param   txOrigin The desired `tx.origin` that should be able to submit an Ethereum txn involving this 0x transaction
     * @return  A typed data object
     */
    createCoordinatorApprovalTypedData(
        transaction: SignedZeroExTransaction,
        verifyingContract: string,
        txOrigin: string,
    ): EIP712TypedData {
        const domain = {
            ...transaction.domain,
            name: constants.COORDINATOR_DOMAIN_NAME,
            version: constants.COORDINATOR_DOMAIN_VERSION,
            verifyingContract,
        };
        // TODO(dorothy-zbornak): Refactor these hash files so we can reuse
        // `transactionHashUtils` here without a circular dep.
        const transactionHash = hexUtils.toHex(
            signTypedDataUtils.generateTypedDataHash(eip712Utils.createZeroExTransactionTypedData(transaction)),
        );
        const approval = {
            txOrigin,
            transactionHash,
            transactionSignature: transaction.signature,
        };
        const typedData = eip712Utils.createTypedData(
            constants.COORDINATOR_APPROVAL_SCHEMA.name,
            {
                CoordinatorApproval: constants.COORDINATOR_APPROVAL_SCHEMA.parameters,
            },
            approval,
            domain,
        );
        return typedData;
    },
    createExchangeProxyMetaTransactionTypedData(mtx: ExchangeProxyMetaTransaction): EIP712TypedData {
        return eip712Utils.createTypedData(
            constants.EXCHANGE_PROXY_MTX_SCEHMA.name,
            {
                MetaTransactionData: constants.EXCHANGE_PROXY_MTX_SCEHMA.parameters,
            },
            _.mapValues(
                _.omit(mtx, 'domain'),
                // tslint:disable-next-line: custom-no-magic-numbers
                v => (BigNumber.isBigNumber(v) ? v.toString(10) : v),
            ) as EIP712Object, // tslint:disable-line:no-unnecessary-type-assertion
            {
                ...constants.MAINNET_EXCHANGE_PROXY_DOMAIN,
                ...mtx.domain,
            },
        );
    },
};
