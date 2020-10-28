// tslint:disable:max-file-line-count

import { EIP712DomainWithDefaultSchema } from '@0x/types';
import { BigNumber } from 'bignumber.js';

export interface Order {
    chainId: number;
    exchangeAddress: string;
    makerAddress: string;
    takerAddress: string;
    feeRecipientAddress: string;
    senderAddress: string;
    makerAssetAmount: BigNumber;
    takerAssetAmount: BigNumber;
    makerFee: BigNumber;
    takerFee: BigNumber;
    expirationTimeSeconds: BigNumber;
    salt: BigNumber;
    makerAssetData: string;
    takerAssetData: string;
    makerFeeAssetData: string;
    takerFeeAssetData: string;
}

export interface SignedOrder extends Order {
    signature: string;
}

export enum MarketOperation {
    Sell = 'Sell',
    Buy = 'Buy',
}

/**
 * ZeroExTransaction for use with 0x Exchange executeTransaction
 */
export interface ZeroExTransaction {
    salt: BigNumber;
    expirationTimeSeconds: BigNumber;
    gasPrice: BigNumber;
    signerAddress: string;
    data: string;
    domain: EIP712DomainWithDefaultSchema;
}

export interface SignedZeroExTransaction extends ZeroExTransaction {
    signature: string;
}

/**
 * Errors originating from the 0x exchange contract
 */
export enum ExchangeContractErrs {
    OrderFillExpired = 'ORDER_FILL_EXPIRED',
    OrderCancelExpired = 'ORDER_CANCEL_EXPIRED',
    OrderCancelled = 'ORDER_CANCELLED',
    OrderFillAmountZero = 'ORDER_FILL_AMOUNT_ZERO',
    OrderRemainingFillAmountZero = 'ORDER_REMAINING_FILL_AMOUNT_ZERO',
    OrderFillRoundingError = 'ORDER_FILL_ROUNDING_ERROR',
    FillBalanceAllowanceError = 'FILL_BALANCE_ALLOWANCE_ERROR',
    InsufficientTakerBalance = 'INSUFFICIENT_TAKER_BALANCE',
    InsufficientTakerAllowance = 'INSUFFICIENT_TAKER_ALLOWANCE',
    InsufficientMakerBalance = 'INSUFFICIENT_MAKER_BALANCE',
    InsufficientMakerAllowance = 'INSUFFICIENT_MAKER_ALLOWANCE',
    InsufficientTakerFeeBalance = 'INSUFFICIENT_TAKER_FEE_BALANCE',
    InsufficientTakerFeeAllowance = 'INSUFFICIENT_TAKER_FEE_ALLOWANCE',
    InsufficientMakerFeeBalance = 'INSUFFICIENT_MAKER_FEE_BALANCE',
    InsufficientMakerFeeAllowance = 'INSUFFICIENT_MAKER_FEE_ALLOWANCE',
    TransactionSenderIsNotFillOrderTaker = 'TRANSACTION_SENDER_IS_NOT_FILL_ORDER_TAKER',
    MultipleMakersInSingleCancelBatchDisallowed = 'MULTIPLE_MAKERS_IN_SINGLE_CANCEL_BATCH_DISALLOWED',
    InsufficientRemainingFillAmount = 'INSUFFICIENT_REMAINING_FILL_AMOUNT',
    MultipleTakerTokensInFillUpToDisallowed = 'MULTIPLE_TAKER_TOKENS_IN_FILL_UP_TO_DISALLOWED',
    BatchOrdersMustHaveSameExchangeAddress = 'BATCH_ORDERS_MUST_HAVE_SAME_EXCHANGE_ADDRESS',
    BatchOrdersMustHaveAtLeastOneItem = 'BATCH_ORDERS_MUST_HAVE_AT_LEAST_ONE_ITEM',
}

export enum SignatureType {
    Illegal,
    Invalid,
    EIP712,
    EthSign,
    Wallet,
    Validator,
    PreSigned,
    EIP1271Wallet,
    NSignatureTypes,
}

export enum AssetProxyId {
    ERC20 = '0xf47261b0',
    ERC721 = '0x02571792',
    MultiAsset = '0x94cfcdd7',
    ERC1155 = '0xa7cb5fb7',
    StaticCall = '0xc339d10a',
    ERC20Bridge = '0xdc1600f3',
}

export interface ERC20AssetData {
    assetProxyId: string;
    tokenAddress: string;
}

export interface ERC20BridgeAssetData {
    assetProxyId: string;
    tokenAddress: string;
    bridgeAddress: string;
    bridgeData: string;
}

export interface ERC721AssetData {
    assetProxyId: string;
    tokenAddress: string;
    tokenId: BigNumber;
}

export interface ERC1155AssetData {
    assetProxyId: string;
    tokenAddress: string;
    tokenIds: BigNumber[];
    tokenValues: BigNumber[];
    callbackData: string;
}

export interface StaticCallAssetData {
    assetProxyId: string;
    callTarget: string;
    staticCallData: string;
    callResultHash: string;
}

export interface ERC1155AssetDataNoProxyId {
    tokenAddress: string;
    tokenValues: BigNumber[];
    tokenIds: BigNumber[];
    callbackData: string;
}

export type SingleAssetData =
    | ERC20AssetData
    | ERC20BridgeAssetData
    | ERC721AssetData
    | ERC1155AssetData
    | StaticCallAssetData;

export interface MultiAssetData {
    assetProxyId: string;
    amounts: BigNumber[];
    nestedAssetData: string[];
}

export interface MultiAssetDataWithRecursiveDecoding {
    assetProxyId: string;
    amounts: BigNumber[];
    nestedAssetData: SingleAssetData[];
}

export interface DutchAuctionData {
    assetData: AssetData;
    beginTimeSeconds: BigNumber;
    beginAmount: BigNumber;
}

export type AssetData = SingleAssetData | MultiAssetData | MultiAssetDataWithRecursiveDecoding;

// TODO: DRY. These should be extracted from contract code.
export enum RevertReason {
    OrderUnfillable = 'ORDER_UNFILLABLE',
    InvalidMaker = 'INVALID_MAKER',
    InvalidTaker = 'INVALID_TAKER',
    InvalidSender = 'INVALID_SENDER',
    InvalidOrderSignature = 'INVALID_ORDER_SIGNATURE',
    InvalidTakerAmount = 'INVALID_TAKER_AMOUNT',
    DivisionByZero = 'DIVISION_BY_ZERO',
    RoundingError = 'ROUNDING_ERROR',
    InvalidSignature = 'INVALID_SIGNATURE',
    SignatureIllegal = 'SIGNATURE_ILLEGAL',
    SignatureInvalid = 'SIGNATURE_INVALID',
    SignatureUnsupported = 'SIGNATURE_UNSUPPORTED',
    TakerOverpay = 'TAKER_OVERPAY',
    OrderOverfill = 'ORDER_OVERFILL',
    InvalidFillPrice = 'INVALID_FILL_PRICE',
    InvalidNewOrderEpoch = 'INVALID_NEW_ORDER_EPOCH',
    CompleteFillFailed = 'COMPLETE_FILL_FAILED',
    NegativeSpreadRequired = 'NEGATIVE_SPREAD_REQUIRED',
    ReentrancyIllegal = 'REENTRANCY_ILLEGAL',
    InvalidTxHash = 'INVALID_TX_HASH',
    InvalidTxSignature = 'INVALID_TX_SIGNATURE',
    FailedExecution = 'FAILED_EXECUTION',
    AssetProxyAlreadyExists = 'ASSET_PROXY_ALREADY_EXISTS',
    LengthGreaterThan0Required = 'LENGTH_GREATER_THAN_0_REQUIRED',
    LengthGreaterThan3Required = 'LENGTH_GREATER_THAN_3_REQUIRED',
    LengthGreaterThan131Required = 'LENGTH_GREATER_THAN_131_REQUIRED',
    Length0Required = 'LENGTH_0_REQUIRED',
    Length65Required = 'LENGTH_65_REQUIRED',
    InvalidAmount = 'INVALID_AMOUNT',
    TransferFailed = 'TRANSFER_FAILED',
    SenderNotAuthorized = 'SENDER_NOT_AUTHORIZED',
    TargetNotAuthorized = 'TARGET_NOT_AUTHORIZED',
    TargetAlreadyAuthorized = 'TARGET_ALREADY_AUTHORIZED',
    IndexOutOfBounds = 'INDEX_OUT_OF_BOUNDS',
    AuthorizedAddressMismatch = 'AUTHORIZED_ADDRESS_MISMATCH',
    OnlyContractOwner = 'ONLY_CONTRACT_OWNER',
    MakerNotWhitelisted = 'MAKER_NOT_WHITELISTED',
    TakerNotWhitelisted = 'TAKER_NOT_WHITELISTED',
    AssetProxyDoesNotExist = 'ASSET_PROXY_DOES_NOT_EXIST',
    LengthMismatch = 'LENGTH_MISMATCH',
    LibBytesGreaterThanZeroLengthRequired = 'GREATER_THAN_ZERO_LENGTH_REQUIRED',
    LibBytesGreaterOrEqualTo4LengthRequired = 'GREATER_OR_EQUAL_TO_4_LENGTH_REQUIRED',
    LibBytesGreaterOrEqualTo20LengthRequired = 'GREATER_OR_EQUAL_TO_20_LENGTH_REQUIRED',
    LibBytesGreaterOrEqualTo32LengthRequired = 'GREATER_OR_EQUAL_TO_32_LENGTH_REQUIRED',
    LibBytesGreaterOrEqualToNestedBytesLengthRequired = 'GREATER_OR_EQUAL_TO_NESTED_BYTES_LENGTH_REQUIRED',
    LibBytesGreaterOrEqualToSourceBytesLengthRequired = 'GREATER_OR_EQUAL_TO_SOURCE_BYTES_LENGTH_REQUIRED',
    Erc20InsufficientBalance = 'ERC20_INSUFFICIENT_BALANCE',
    Erc20InsufficientAllowance = 'ERC20_INSUFFICIENT_ALLOWANCE',
    FeePercentageTooLarge = 'FEE_PERCENTAGE_TOO_LARGE',
    ValueGreaterThanZero = 'VALUE_GREATER_THAN_ZERO',
    InvalidMsgValue = 'INVALID_MSG_VALUE',
    InsufficientEthRemaining = 'INSUFFICIENT_ETH_REMAINING',
    Uint256Overflow = 'UINT256_OVERFLOW',
    Erc721ZeroToAddress = 'ERC721_ZERO_TO_ADDRESS',
    Erc721OwnerMismatch = 'ERC721_OWNER_MISMATCH',
    Erc721InvalidSpender = 'ERC721_INVALID_SPENDER',
    Erc721ZeroOwner = 'ERC721_ZERO_OWNER',
    Erc721InvalidSelector = 'ERC721_INVALID_SELECTOR',
    WalletError = 'WALLET_ERROR',
    ValidatorError = 'VALIDATOR_ERROR',
    InvalidFunctionSelector = 'INVALID_FUNCTION_SELECTOR',
    InvalidAssetData = 'INVALID_ASSET_DATA',
    InvalidAssetProxy = 'INVALID_ASSET_PROXY',
    UnregisteredAssetProxy = 'UNREGISTERED_ASSET_PROXY',
    TxFullyConfirmed = 'TX_FULLY_CONFIRMED',
    TxNotFullyConfirmed = 'TX_NOT_FULLY_CONFIRMED',
    TimeLockIncomplete = 'TIME_LOCK_INCOMPLETE',
    // LibAddressArray
    InvalidFreeMemoryPtr = 'INVALID_FREE_MEMORY_PTR',
    // DutchAuction
    AuctionInvalidAmount = 'INVALID_AMOUNT',
    AuctionExpired = 'AUCTION_EXPIRED',
    AuctionNotStarted = 'AUCTION_NOT_STARTED',
    AuctionInvalidBeginTime = 'INVALID_BEGIN_TIME',
    InvalidAssetDataEnd = 'INVALID_ASSET_DATA_END',
    // Balance Threshold Filter
    InvalidOrBlockedExchangeSelector = 'INVALID_OR_BLOCKED_EXCHANGE_SELECTOR',
    BalanceQueryFailed = 'BALANCE_QUERY_FAILED',
    AtLeastOneAddressDoesNotMeetBalanceThreshold = 'AT_LEAST_ONE_ADDRESS_DOES_NOT_MEET_BALANCE_THRESHOLD',
    FromLessThanToRequired = 'FROM_LESS_THAN_TO_REQUIRED',
    ToLessThanLengthRequired = 'TO_LESS_THAN_LENGTH_REQUIRED',
    InvalidApprovalSignature = 'INVALID_APPROVAL_SIGNATURE',
    ApprovalExpired = 'APPROVAL_EXPIRED',
    InvalidOrigin = 'INVALID_ORIGIN',
    // ERC1155
    AmountEqualToOneRequired = 'AMOUNT_EQUAL_TO_ONE_REQUIRED',
    BadReceiverReturnValue = 'BAD_RECEIVER_RETURN_VALUE',
    CannotTransferToAddressZero = 'CANNOT_TRANSFER_TO_ADDRESS_ZERO',
    InsufficientAllowance = 'INSUFFICIENT_ALLOWANCE',
    NFTNotOwnedByFromAddress = 'NFT_NOT_OWNED_BY_FROM_ADDRESS',
    OwnersAndIdsMustHaveSameLength = 'OWNERS_AND_IDS_MUST_HAVE_SAME_LENGTH',
    TokenAndValuesLengthMismatch = 'TOKEN_AND_VALUES_LENGTH_MISMATCH',
    TriedToMintFungibleForNonFungibleToken = 'TRIED_TO_MINT_FUNGIBLE_FOR_NON_FUNGIBLE_TOKEN',
    TriedToMintNonFungibleForFungibleToken = 'TRIED_TO_MINT_NON_FUNGIBLE_FOR_FUNGIBLE_TOKEN',
    TransferRejected = 'TRANSFER_REJECTED',
    Uint256Underflow = 'UINT256_UNDERFLOW',
    InvalidIdsOffset = 'INVALID_IDS_OFFSET',
    InvalidValuesOffset = 'INVALID_VALUES_OFFSET',
    InvalidDataOffset = 'INVALID_DATA_OFFSET',
    InvalidAssetDataLength = 'INVALID_ASSET_DATA_LENGTH',
    // StaticCall
    InvalidStaticCallDataOffset = 'INVALID_STATIC_CALL_DATA_OFFSET',
    TargetNotEven = 'TARGET_NOT_EVEN',
    UnexpectedStaticCallResult = 'UNEXPECTED_STATIC_CALL_RESULT',
    TransfersSuccessful = 'TRANSFERS_SUCCESSFUL',
    // Staking
    InsufficientFunds = 'INSUFFICIENT_FUNDS',
    // AssetProxyOwner
    TxAlreadyExecuted = 'TX_ALREADY_EXECUTED',
    DefaultTimeLockIncomplete = 'DEFAULT_TIME_LOCK_INCOMPLETE',
    CustomTimeLockIncomplete = 'CUSTOM_TIME_LOCK_INCOMPLETE',
    EqualLengthsRequired = 'EQUAL_LENGTHS_REQUIRED',
    OnlyCallableByWallet = 'ONLY_CALLABLE_BY_WALLET',
    ChaiBridgeOnlyCallableByErc20BridgeProxy = 'ChaiBridge/ONLY_CALLABLE_BY_ERC20_BRIDGE_PROXY',
    ChaiBridgeDrawDaiFailed = 'ChaiBridge/DRAW_DAI_FAILED',
    DydxBridgeOnlyCallableByErc20BridgeProxy = 'DydxBridge/ONLY_CALLABLE_BY_ERC20_BRIDGE_PROXY',
    DydxBridgeUnrecognizedBridgeAction = 'DydxBridge/UNRECOGNIZED_BRIDGE_ACTION',
}

export enum OrderStatus {
    Invalid,
    InvalidMakerAssetAmount,
    InvalidTakerAssetAmount,
    Fillable,
    Expired,
    FullyFilled,
    Cancelled,
}

export interface FillResults {
    makerAssetFilledAmount: BigNumber;
    takerAssetFilledAmount: BigNumber;
    makerFeePaid: BigNumber;
    takerFeePaid: BigNumber;
    protocolFeePaid: BigNumber;
}

export interface MatchedFillResults {
    left: FillResults;
    right: FillResults;
    profitInLeftMakerAsset: BigNumber;
    profitInRightMakerAsset: BigNumber;
}

export interface BatchMatchedFillResults {
    left: FillResults[];
    right: FillResults[];
    profitInLeftMakerAsset: BigNumber;
    profitInRightMakerAsset: BigNumber;
}

export interface OrderInfo {
    orderStatus: number;
    orderHash: string;
    orderTakerAssetFilledAmount: BigNumber;
}
