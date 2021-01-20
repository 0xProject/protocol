import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { SupportedProvider } from '@0x/subproviders';
import { EIP712TypedData } from '@0x/types';
import { BigNumber, hexUtils, NULL_ADDRESS } from '@0x/utils';

import { ZERO } from './constants';
import {
    createExchangeProxyEIP712Domain,
    EIP712_DOMAIN_PARAMETERS,
    getExchangeProxyEIP712Hash,
    getTypeHash,
} from './eip712_utils';
import {
    eip712SignTypedDataWithKey,
    eip712SignTypedDataWithProviderAsync,
    ethSignHashWithKey,
    ethSignHashWithProviderAsync,
    Signature,
    SignatureType,
} from './signature_utils';

const COMMON_ORDER_DEFAULT_VALUES = {
    makerToken: NULL_ADDRESS,
    takerToken: NULL_ADDRESS,
    makerAmount: ZERO,
    takerAmount: ZERO,
    maker: NULL_ADDRESS,
    taker: NULL_ADDRESS,
    pool: hexUtils.leftPad(0),
    expiry: ZERO,
    salt: ZERO,
    chainId: 1,
    verifyingContract: getContractAddressesForChainOrThrow(1).exchangeProxy,
};
const LIMIT_ORDER_DEFAULT_VALUES = {
    ...COMMON_ORDER_DEFAULT_VALUES,
    takerTokenFeeAmount: ZERO,
    sender: NULL_ADDRESS,
    feeRecipient: NULL_ADDRESS,
};
const RFQ_ORDER_DEFAULT_VALUES = {
    ...COMMON_ORDER_DEFAULT_VALUES,
    txOrigin: NULL_ADDRESS,
};

const BRIDGE_ORDER_DEFAULT_VALUES = {
    source: ZERO,
    takerTokenAmount: ZERO,
    makerTokenAmount: ZERO,
    bridgeData: '',
}

export type CommonOrderFields = typeof COMMON_ORDER_DEFAULT_VALUES;
export type LimitOrderFields = typeof LIMIT_ORDER_DEFAULT_VALUES;
export type RfqOrderFields = typeof RFQ_ORDER_DEFAULT_VALUES;
export type BridgeOrderFields = typeof BRIDGE_ORDER_DEFAULT_VALUES;
export type NativeOrder = RfqOrder | LimitOrder;

export enum OrderStatus {
    Invalid = 0,
    Fillable = 1,
    Filled = 2,
    Cancelled = 3,
    Expired = 4,
}

export interface OrderInfo {
    status: OrderStatus;
    orderHash: string;
    takerTokenFilledAmount: BigNumber;
}

export abstract class OrderBase {
    public makerToken: string;
    public takerToken: string;
    public makerAmount: BigNumber;
    public takerAmount: BigNumber;
    public maker: string;
    public pool: string;
    public taker: string;
    public expiry: BigNumber;
    public salt: BigNumber;
    public chainId: number;
    public verifyingContract: string;

    protected constructor(fields: Partial<CommonOrderFields> = {}) {
        const _fields = { ...COMMON_ORDER_DEFAULT_VALUES, ...fields };
        this.makerToken = _fields.makerToken;
        this.takerToken = _fields.takerToken;
        this.makerAmount = _fields.makerAmount;
        this.takerAmount = _fields.takerAmount;
        this.maker = _fields.maker;
        this.taker = _fields.taker;
        this.pool = _fields.pool;
        this.expiry = _fields.expiry;
        this.salt = _fields.salt;
        this.chainId = _fields.chainId;
        this.verifyingContract = _fields.verifyingContract;
    }

    public abstract getStructHash(): string;
    public abstract getEIP712TypedData(): EIP712TypedData;

    public getHash(): string {
        return getExchangeProxyEIP712Hash(this.getStructHash(), this.chainId, this.verifyingContract);
    }

    public willExpire(secondsFromNow: number = 0): boolean {
        const millisecondsInSecond = 1000;
        const currentUnixTimestampSec = new BigNumber(Date.now() / millisecondsInSecond).integerValue();
        return this.expiry.isLessThan(currentUnixTimestampSec.plus(secondsFromNow));
    }

    public async getSignatureWithProviderAsync(
        provider: SupportedProvider,
        type: SignatureType = SignatureType.EthSign,
    ): Promise<Signature> {
        switch (type) {
            case SignatureType.EIP712:
                return eip712SignTypedDataWithProviderAsync(this.getEIP712TypedData(), this.maker, provider);
            case SignatureType.EthSign:
                return ethSignHashWithProviderAsync(this.getHash(), this.maker, provider);
            default:
                throw new Error(`Cannot sign with signature type: ${type}`);
        }
    }

    public getSignatureWithKey(key: string, type: SignatureType = SignatureType.EthSign): Signature {
        switch (type) {
            case SignatureType.EIP712:
                return eip712SignTypedDataWithKey(this.getEIP712TypedData(), key);
            case SignatureType.EthSign:
                return ethSignHashWithKey(this.getHash(), key);
            default:
                throw new Error(`Cannot sign with signature type: ${type}`);
        }
    }
}

export class LimitOrder extends OrderBase {
    public static readonly STRUCT_NAME = 'LimitOrder';
    public static readonly STRUCT_ABI = [
        { type: 'address', name: 'makerToken' },
        { type: 'address', name: 'takerToken' },
        { type: 'uint128', name: 'makerAmount' },
        { type: 'uint128', name: 'takerAmount' },
        { type: 'uint128', name: 'takerTokenFeeAmount' },
        { type: 'address', name: 'maker' },
        { type: 'address', name: 'taker' },
        { type: 'address', name: 'sender' },
        { type: 'address', name: 'feeRecipient' },
        { type: 'bytes32', name: 'pool' },
        { type: 'uint64', name: 'expiry' },
        { type: 'uint256', name: 'salt' },
    ];
    public static readonly TYPE_HASH = getTypeHash(LimitOrder.STRUCT_NAME, LimitOrder.STRUCT_ABI);

    public takerTokenFeeAmount: BigNumber;
    public sender: string;
    public feeRecipient: string;

    constructor(fields: Partial<LimitOrderFields> = {}) {
        const _fields = { ...LIMIT_ORDER_DEFAULT_VALUES, ...fields };
        super(_fields);
        this.takerTokenFeeAmount = _fields.takerTokenFeeAmount;
        this.sender = _fields.sender;
        this.feeRecipient = _fields.feeRecipient;
    }

    public clone(fields: Partial<LimitOrderFields> = {}): LimitOrder {
        return new LimitOrder({
            makerToken: this.makerToken,
            takerToken: this.takerToken,
            makerAmount: this.makerAmount,
            takerAmount: this.takerAmount,
            takerTokenFeeAmount: this.takerTokenFeeAmount,
            maker: this.maker,
            taker: this.taker,
            sender: this.sender,
            feeRecipient: this.feeRecipient,
            pool: this.pool,
            expiry: this.expiry,
            salt: this.salt,
            chainId: this.chainId,
            verifyingContract: this.verifyingContract,
            ...fields,
        });
    }

    public getStructHash(): string {
        return hexUtils.hash(
            hexUtils.concat(
                hexUtils.leftPad(LimitOrder.TYPE_HASH),
                hexUtils.leftPad(this.makerToken),
                hexUtils.leftPad(this.takerToken),
                hexUtils.leftPad(this.makerAmount),
                hexUtils.leftPad(this.takerAmount),
                hexUtils.leftPad(this.takerTokenFeeAmount),
                hexUtils.leftPad(this.maker),
                hexUtils.leftPad(this.taker),
                hexUtils.leftPad(this.sender),
                hexUtils.leftPad(this.feeRecipient),
                hexUtils.leftPad(this.pool),
                hexUtils.leftPad(this.expiry),
                hexUtils.leftPad(this.salt),
            ),
        );
    }

    public getEIP712TypedData(): EIP712TypedData {
        return {
            types: {
                EIP712Domain: EIP712_DOMAIN_PARAMETERS,
                [LimitOrder.STRUCT_NAME]: LimitOrder.STRUCT_ABI,
            },
            domain: createExchangeProxyEIP712Domain(this.chainId, this.verifyingContract) as any,
            primaryType: LimitOrder.STRUCT_NAME,
            message: {
                makerToken: this.makerToken,
                takerToken: this.takerToken,
                makerAmount: this.makerAmount.toString(10),
                takerAmount: this.takerAmount.toString(10),
                takerTokenFeeAmount: this.takerTokenFeeAmount.toString(10),
                maker: this.maker,
                taker: this.taker,
                sender: this.sender,
                feeRecipient: this.feeRecipient,
                pool: this.pool,
                expiry: this.expiry.toString(10),
                salt: this.salt.toString(10),
            },
        };
    }
}

export class RfqOrder extends OrderBase {
    public static readonly STRUCT_NAME = 'RfqOrder';
    public static readonly STRUCT_ABI = [
        { type: 'address', name: 'makerToken' },
        { type: 'address', name: 'takerToken' },
        { type: 'uint128', name: 'makerAmount' },
        { type: 'uint128', name: 'takerAmount' },
        { type: 'address', name: 'maker' },
        { type: 'address', name: 'taker' },
        { type: 'address', name: 'txOrigin' },
        { type: 'bytes32', name: 'pool' },
        { type: 'uint64', name: 'expiry' },
        { type: 'uint256', name: 'salt' },
    ];
    public static readonly TYPE_HASH = getTypeHash(RfqOrder.STRUCT_NAME, RfqOrder.STRUCT_ABI);

    public txOrigin: string;

    constructor(fields: Partial<RfqOrderFields> = {}) {
        const _fields = { ...RFQ_ORDER_DEFAULT_VALUES, ...fields };
        super(_fields);
        this.txOrigin = _fields.txOrigin;
    }

    public clone(fields: Partial<RfqOrderFields> = {}): RfqOrder {
        return new RfqOrder({
            makerToken: this.makerToken,
            takerToken: this.takerToken,
            makerAmount: this.makerAmount,
            takerAmount: this.takerAmount,
            maker: this.maker,
            taker: this.taker,
            txOrigin: this.txOrigin,
            pool: this.pool,
            expiry: this.expiry,
            salt: this.salt,
            chainId: this.chainId,
            verifyingContract: this.verifyingContract,
            ...fields,
        });
    }

    public getStructHash(): string {
        return hexUtils.hash(
            hexUtils.concat(
                hexUtils.leftPad(RfqOrder.TYPE_HASH),
                hexUtils.leftPad(this.makerToken),
                hexUtils.leftPad(this.takerToken),
                hexUtils.leftPad(this.makerAmount),
                hexUtils.leftPad(this.takerAmount),
                hexUtils.leftPad(this.maker),
                hexUtils.leftPad(this.taker),
                hexUtils.leftPad(this.txOrigin),
                hexUtils.leftPad(this.pool),
                hexUtils.leftPad(this.expiry),
                hexUtils.leftPad(this.salt),
            ),
        );
    }

    public getEIP712TypedData(): EIP712TypedData {
        return {
            types: {
                EIP712Domain: EIP712_DOMAIN_PARAMETERS,
                [RfqOrder.STRUCT_NAME]: RfqOrder.STRUCT_ABI,
            },
            domain: createExchangeProxyEIP712Domain(this.chainId, this.verifyingContract) as any,
            primaryType: RfqOrder.STRUCT_NAME,
            message: {
                makerToken: this.makerToken,
                takerToken: this.takerToken,
                makerAmount: this.makerAmount.toString(10),
                takerAmount: this.takerAmount.toString(10),
                maker: this.maker,
                taker: this.taker,
                txOrigin: this.txOrigin,
                pool: this.pool,
                expiry: this.expiry.toString(10),
                salt: this.salt.toString(10),
            },
        };
    }
}
