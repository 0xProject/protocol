---
title: Basic Functionality
---

Below is a catalog of basic Exchange functionality. For more advanced
usage, like meta-transactions and dex aggregation, see the Advanced
section.

  ------------------------------------------------------------------------------- ---------------------------------------------
  **Limit Orders**                                                                **Overview**

  [fillLimitOrder](#filllimitorder)                                               Fills a Limit Order up to the amount
                                                                                  requested.

  [fillOrKillLimitOrder](#fillorkilllimitorder)                                   Fills exactly the amount requested or
                                                                                  reverts.

  [cancelLimitOrder](#cancellimitorder)                                           Cancels an order so that it can no longer be
                                                                                  filled.

  [batchCancelLimitOrders](#batchcancellimitorders)                               A batch call to
                                                                                  [cancelLimitOrder]{.title-ref}.

  [cancelPairLimitOrders](#cancelpairlimitorders)                                 Cancels Limit orders in a specific market
                                                                                  pair. Ex: Cancel all Limit Orders selling
                                                                                  WETH for USDC.

  [cancelPairLimitOrdersWithSigner](#cancelpairlimitorderswithsigner)             Same functionality to `cancelPairLimitOrders`
                                                                                  but called by a registered order signer
                                                                                  instead of the maker itself.

  [batchCancelPairLimitOrders](#batchcancelpairlimitorders)                       A batch call to
                                                                                  [cancelPairLimitOrders]{.title-ref}.

  [batchCancelPairLimitOrdersWithSigner](#batchcancelpairlimitorderswithsigner)   Same functionality to `cancelPairLimitOrders`
                                                                                  but called by a registered order signer
                                                                                  instead of the maker itself.

  [getLimitOrderInfo](#getlimitorderinfo)                                         Returns the state of a given order.

  [getLimitOrderHash](#getlimitorderhash)                                         Returns the EIP-712 hash for an order.

  **RFQ Orders**                                                                  **Overview**

  [fillRfqOrder](#fillrfqorder)                                                   These are analogous to the above LimitOrder
                                                                                  functions.
  ------------------------------------------------------------------------------- ---------------------------------------------

+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| \| [fillOrKillRfqOrder](#fillorkillrfqorder) \| \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| \| [cancelRfqOrder](#cancelrfqorder) \| \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| \| [batchCancelRfqOrders](#batchcancelrfqorders) \| \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| \| [cancelPairRfqOrders](#cancelpairrfqorders) \| \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| \| [cancelPairRfqOrdersWithSigner](#cancelpairrfqorderswithsigner) \|
\|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| \| [batchCancelPairRfqOrders](#batchcancelpairrfqorders) \| \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| \|
[batchCancelPairRfqOrdersWithSigner](#batchcancelpairrfqorderswithsigner)
\| \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| \| [getRfqOrderInfo](#getrfqorderinfo) \| \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| \| [getRfqOrderHash](#getrfqorderhash) \| \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| [registerAllowedRfqOrigins](#registerallowedrfqorigins) \| Register
tx.origin addresses that are allowed to fill an RFQ order. \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| [registerAllowedOrderSigner](#registerallowedordersigner) \| Register
addresses that can sign orders on behalf of `msg.sender`. \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| [isValidOrderSigner](#isvalidordersigner) \| Returns whether a given
address is allowed to sign orders for a given \| \| \| maker address. \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| **Protocol Fees** \| **Overview** \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| [getProtocolFeeMultiplier](#getprotocolfeemultiplier) \| Takers of
limit orders pay a protocol fee of [Multiplier \*
tx.gasprice]{.title-ref}. \| \| \| This returns the
[Multiplier]{.title-ref}. \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+
\| [transferProtocolFeesForPools](#transferprotocolfeesforpools) \|
Transfers protocol fees from escrow to the 0x Staking System. \| \| \|
This should be called near the end of each epoch. \|
+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--+

# Limit Orders

These are the basic functions for using a [Limit
Order](../basics/orders.html#limit-orders).

## fillLimitOrder

Limit orders can be filled with the `fillLimitOrder()` or
`fillOrKillLimitOrder()` functions on the Exchange Proxy. The address
calling these function will be considered the \"taker\" of the order.

`fillLimitOrder()` fills a single limit order for **up to**
`takerTokenFillAmount`:

``` {.solidity}
function fillLimitOrder(
    // The order
    LimitOrder calldata order,
    // The signature
    Signature calldata signature,
    // How much taker token to fill the order with
    uint128 takerTokenFillAmount
)
    external
    payable
    // How much maker token from the order the taker received.
    returns (uint128 takerTokenFillAmount, uint128 makerTokenFillAmount);
```

If the trade is successful a
[LimitOrderFilled](../basics/events.html#limitorderfilled) will be
emitted. This function reverts under any of the following conditions:

-   The order is fully filled: taker amount sold greater or equal to
    `order.takerAmount`.
-   The order has expired.
-   The order was cancelled.
-   The market pair (Ex, `WETH/USDT`) was cancelled (`order.salt` is
    less than the value passed to `cancelPairLimitOrders`.
-   Either the maker or taker has an insufficient allowance/balance.
-   The order\'s `taker` field is non-zero and does not match the actual
    taker. This is `msg.sender`, unless used with
    [meta-transactions](../advanced/mtx.rst) in which case it is the
    signer.
-   The order\'s `sender` field is non-zero and does not match
    `msg.sender`.
-   The maker\'s signature is invalid.
-   The order\'s `takerTokenFeeAmount` is non-zero but the fee cannot be
    paid due to insufficient allowance/balance.
-   Not enough ETH was sent with the transaction to cover the [Protocol
    Fee](../basics/protocol_fees.html).

## fillOrKillLimitOrder

`fillOrKillLimitOrder()` fills a single limit order for **exactly**
`takerTokenFillAmount`:

``` {.solidity}
function fillOrKillLimitOrder(
    // The order
    LimitOrder calldata order,
    // The signature
    Signature calldata signature,
    // How much taker token to fill the order with
    uint128 takerTokenFillAmount
)
    external
    payable
    // How much maker token from the order the taker received.
    returns (uint128 makerTokenFillAmount);
```

If the trade is successful a
[LimitOrderFilled](../basics/events.html#limitorderfilled) will be
emitted. This function reverts under any of the conditions outlined
above for `fillLimitOrder`. Additionally, it will revert if the amount
filled is less than `takerTokenFillAmount`.

## cancelLimitOrder

This function cancels a single limit order created by the caller:

``` {.solidity}
function cancelLimitOrder(
    // The order
    LimitOrder calldata order
)
    external;
```

This function emits an
[OrderCancelled](../basics/events.html#ordercancelled) event if the
cancellation is successful. The call will revert if
`msg.sender != order.maker` or `!isValidOrderSigner(maker, msg.sender)`.

## batchCancelLimitOrders

This function cancels multiple limit orders created by the caller:

``` {.solidity}
function batchCancelLimitOrders(
    // The orders
    LimitOrder[] calldata orders
)
    external;
```

This function emits an
[OrderCancelled](../basics/events.html#ordercancelled) event for each
order it cancels. The call will revert if `msg.sender != order.maker` or
`!isValidOrderSigner(maker, msg.sender)` for any of the orders.

## cancelPairLimitOrders

This function cancels all limit orders created by the caller with with a
maker and taker token pair and a `salt` field \< the `salt` provided.
Subsequent calls to this function with the same tokens must provide a
`salt` \>= the last call to succeed.

``` {.solidity}
function cancelPairLimitOrders(
    address makerToken,
    address takerToken,
    uint256 salt;
)
    external;
```

This function emits a
[PairCancelledLimitOrders](../basics/events.html#paircancelledlimitorders)
event, or reverts if the `salt` parameter is ≤ to a previous `salt`.

## cancelPairLimitOrdersWithSigner

Same functionality as `cancelPairLimitOrders` but `msg.sender` is a
registered order signer instead of the maker itself.

``` {.solidity}
/// @dev Cancel all limit orders for a given maker and pair with a salt less
///      than the value provided. The caller must be a signer registered to the maker.
///      Subsequent calls to this function with the same maker and pair require the
///      new salt to be >= the old salt.
/// @param maker The maker for which to cancel.
/// @param makerToken The maker token.
/// @param takerToken The taker token.
/// @param minValidSalt The new minimum valid salt.
function cancelPairLimitOrdersWithSigner(
    address maker,
    IERC20TokenV06 makerToken,
    IERC20TokenV06 takerToken,
    uint256 minValidSalt
)
    external;
```

Reverts if `!isValidOrderSigner(maker, msg.sender)`.

## batchCancelPairLimitOrders

This function performs multiple `cancelPairLimitOrders()` at once. Each
respective index across arrays is equivalent to a single call.

``` {.solidity}
function batchCancelPairLimitOrders(
    address[] makerTokens,
    address[] takerTokens,
    uint256[] salts;
)
    external;
```

This function emits a
[PairCancelledLimitOrders](../basics/events.html#paircancelledlimitorders)
event for each market pair it cancels. It reverts if any of the
individual cancellations revert.

## batchCancelPairLimitOrdersWithSigner

Same functionality as `batchCancelPairLimitOrders` but `msg.sender` is a
registered order signer instead of the maker itself.

``` {.solidity}
/// @dev Cancel all limit orders for a given maker and pairs with salts less
///      than the values provided. The caller must be a signer registered to the maker.
///      Subsequent calls to this function with the same maker and pair require the
///      new salt to be >= the old salt.
/// @param maker The maker for which to cancel.
/// @param makerTokens The maker tokens.
/// @param takerTokens The taker tokens.
/// @param minValidSalts The new minimum valid salts.
function batchCancelPairLimitOrdersWithSigner(
    address maker,
    IERC20TokenV06[] memory makerTokens,
    IERC20TokenV06[] memory takerTokens,
    uint256[] memory minValidSalts
)
    external;
```

Reverts if `!isValidOrderSigner(maker, msg.sender)`.

## getLimitOrderInfo

The Exchange Proxy exposes a function `getLimitOrderInfo()` to query
information about a limit order, such as its fillable state and how much
it has been filled by.

``` {.solidity}
enum OrderStatus {
    INVALID,
    FILLABLE,
    FILLED,
    CANCELLED,
    EXPIRED
}

struct OrderInfo {
    // The order hash.
    bytes32 orderHash;
    // Current state of the order.
    OrderStatus status;
    // How much taker token has been filled in the order.
    uint128 takerTokenFilledAmount;
}

function getLimitOrderInfo(
    // The order
    LimitOrder calldata order
)
    external
    view
    returns (OrderInfo memory orderInfo);
```

## getLimitOrderHash

The hash of the order is used to uniquely identify an order inside the
protocol. It is computed following the [EIP712
spec](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md)
standard. In solidity, the hash is computed as:

``` {.solidity}
/// @dev Get the canonical hash of a limit order.
/// @param order The limit order.
/// @return orderHash The order hash.
function getLimitOrderHash(LibNativeOrder.LimitOrder calldata order)
    external
    view
    returns (bytes32 orderHash);
```

The simplest way to generate an order hash is by calling this function,
ex:

``` {.solidity}
bytes32 orderHash = IZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF).getLimitOrderHash(order);
```

The hash can be manually generated using the following code:

``` {.solidity}
bytes32 orderHash = keccak256(abi.encodePacked(
    '\x19\x01',
    // The domain separator.
    keccak256(abi.encode(
        // The EIP712 domain separator type hash.
        keccak256(abi.encodePacked(
            'EIP712Domain(',
            'string name,',
            'string version,',
            'uint256 chainId,',
            'address verifyingContract)'
        )),
        // The EIP712 domain separator values.
        keccak256('ZeroEx'),
        keccak256('1.0.0'),
        1, // For mainnet
        0xDef1C0ded9bec7F1a1670819833240f027b25EfF, // Address of the Exchange Proxy
    )),
    // The struct hash.
    keccak256(abi.encode(
        // The EIP712 type hash.
        keccak256(abi.encodePacked(
            'LimitOrder(',
            'address makerToken,',
            'address takerToken,',
            'uint128 makerAmount,',
            'uint128 takerAmount,',
            'uint128 takerTokenFeeAmount,',
            'address maker,',
            'address taker,',
            'address sender,',
            'address feeRecipient,',
            'bytes32 pool,',
            'uint64 expiry,',
            'uint256 salt)'
        )),
        // The struct values.
        order.makerToken,
        order.takerToken,
        order.makerAmount,
        order.takerAmount,
        order.takerTokenFeeAmount,
        order.maker,
        order.taker,
        order.sender,
        order.feeRecipient,
        order.pool,
        order.expiry,
        order.salt
    ))
));
```

# RFQ Orders

These are the basic functions for using an [RFQ
Order](../basics/orders.html#rfq-orders).

## fillRfqOrder

RFQ orders can be filled with the `fillRfqOrder()` or
`fillOrKillRfqOrder()` functions on the Exchange Proxy. The address
calling this function will be considered the \"taker\" of the order.

`fillRfqOrder()` fills a single RFQ order for **up to**
`takerTokenFillAmount`:

``` {.solidity}
function fillRfqOrder(
    // The order
    RfqOrder calldata order,
    // The signature
    Signature calldata signature,
    // How much taker token to fill the order with
    uint128 takerTokenFillAmount
)
    external
    payable
    // How much maker token from the order the taker received.
    returns (uint128 takerTokenFillAmount, uint128 makerTokenFillAmount);
```

If the trade is successful a
[RfqOrderFilled](../basics/events.html#rfqorderfilled) will be emitted.
This function reverts under any of the following conditions:

-   The order is fully filled: taker amount sold greater or equal to
    `order.takerAmount`.
-   The order has expired.
-   The order was cancelled.
-   The market pair (Ex, `WETH/USDT`) was cancelled (`order.salt` is
    less than the value passed to `cancelPairLimitOrders`.
-   Either the maker or taker has an insufficient allowance/balance.
-   The order\'s `taker` field is non-zero and does not match the actual
    taker. This is `msg.sender`, unless used with
    [meta-transactions](../advanced/mtx.rst) in which case it is the
    signer.
-   The order\'s `origin` field is non-zero and does not match
    `tx.origin` or a valid origin (see
    [registerAllowedRfqOrigins](#registerallowedrfqorigins)).
-   The maker\'s signature is invalid.

## fillOrKillRfqOrder

`fillOrKillRfqOrder()` fills a single RFQ order for **exactly**
`takerTokenFillAmount`:

``` {.solidity}
function fillOrKillRfqOrder(
    // The order
    RfqOrder calldata order,
    // The signature
    Signature calldata signature,
    // How much taker token to fill the order with
    uint128 takerTokenFillAmount
)
    external
    payable
    // How much maker token from the order the taker received.
    returns (uint128 makerTokenFillAmount);
```

If the trade is successful a
[RfqOrderFilled](../basics/events.html#rfqorderfilled) will be emitted.
This function reverts under any of the conditions outlined above for
`fillRfqOrder`. Additionally, it will revert if the amount filled is
less than `takerTokenFillAmount`.

## cancelRfqOrder

Similar to limit orders, RFQ orders can be cancelled on-chain through a
variety of functions, which can only be called by the order\'s maker.

`cancelRfqOrder()` cancels a single RFQ order created by the caller:

``` {.solidity}
function cancelRfqOrder(
    // The order
    RfqOrder calldata order
)
    external;
```

This function emits an
[OrderCancelled](../basics/events.html#ordercancelled) event if the
cancellation is successful. The call will revert if
`msg.sender != order.maker` or `!isValidOrderSigner(maker, msg.sender)`.

## batchCancelRfqOrders

This function cancels multiple RFQ orders created by the caller:

``` {.solidity}
function batchCancelRfqOrders(
    // The orders
    RfqOrder[] calldata orders
)
    external;
```

This function emits an
[OrderCancelled](../basics/events.html#ordercancelled) event for each
order it cancels. The call will revert if `msg.sender != order.maker` or
`!isValidOrderSigner(maker, msg.sender)` for any orders for any of the
orders.

## cancelPairRfqOrders

This function cancels all RFQ orders created by the caller with with a
maker and taker token pair and a `salt` field \< the `salt` provided.
Subsequent calls to this function with the same tokens must provide a
`salt` \>= the last call to succeed.

``` {.solidity}
function cancelPairRfqOrders(
    address makerToken,
    address takerToken,
    uint256 salt;
)
    external;
```

This function emits a
[PairCancelledRfqOrders](../basics/events.html#paircancelledrfqorders)
event, or reverts if the `salt` parameter is ≤ to a previous `salt`.

## cancelPairRfqOrdersWithSigner

Same functionality as `cancelPairRfqOrders` but `msg.sender` is a
registered order signer instead of the maker itself.

``` {.solidity}
/// @dev Cancel all RFQ orders for a given maker and pair with a salt less
///      than the value provided. The caller must be a signer registered to the maker.
///      Subsequent calls to this function with the same maker and pair require the
///      new salt to be >= the old salt.
/// @param maker The maker for which to cancel.
/// @param makerToken The maker token.
/// @param takerToken The taker token.
/// @param minValidSalt The new minimum valid salt.
function cancelPairRfqOrdersWithSigner(
    address maker,
    IERC20TokenV06 makerToken,
    IERC20TokenV06 takerToken,
    uint256 minValidSalt
)
    external;
```

Reverts if `!isValidOrderSigner(maker, msg.sender)`.

## batchCancelPairRfqOrders

`batchCancelPairRfqOrders()` performs multiple `cancelPairRfqOrders()`
at once. Each respective index across arrays is equivalent to a single
call.

``` {.solidity}
function batchCancelPairRfqOrders(
    address[] makerTokens,
    address[] takerTokens,
    uint256[] salts;
)
    external;
```

This function emits a
[PairCancelledRfqOrders](../basics/events.html#paircancelledrfqorders)
event for each market pair it cancels. It reverts if any of the
individual cancellations revert.

## batchCancelPairRfqOrdersWithSigner

Same functionality as `batchCancelPairRfqOrders` but `msg.sender` is a
registered order signer instead of the maker itself.

``` {.solidity}
/// @dev Cancel all RFQ orders for a given maker and pairs with salts less
///      than the values provided. The caller must be a signer registered to the maker.
///      Subsequent calls to this function with the same maker and pair require the
///      new salt to be >= the old salt.
/// @param maker The maker for which to cancel.
/// @param makerTokens The maker tokens.
/// @param takerTokens The taker tokens.
/// @param minValidSalts The new minimum valid salts.
function batchCancelPairRfqOrdersWithSigner(
    address maker,
    IERC20TokenV06[] memory makerTokens,
    IERC20TokenV06[] memory takerTokens,
    uint256[] memory minValidSalts
)
    external;
```

Reverts if `!isValidOrderSigner(maker, msg.sender)`.

## getRfqOrderInfo

The Exchange Proxy exposes a function `getRfqOrderInfo()` to query
information about an RFQ order, such as its fillable state and how much
it has been filled by.

``` {.solidity}
enum OrderStatus {
    INVALID,
    FILLABLE,
    FILLED,
    CANCELLED,
    EXPIRED
}

struct OrderInfo {
    // The order hash.
    bytes32 orderHash;
    // Current state of the order.
    OrderStatus status;
    // How much taker token has been filled in the order.
    uint128 takerTokenFilledAmount;
}

function getRfqOrderInfo(
    // The order
    RfqOrder calldata order
)
    external
    view
    returns (OrderInfo memory orderInfo);
```

## getRfqOrderHash

The hash of the order is used to uniquely identify an order inside the
protocol. It is computed following the [EIP712
spec](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md)
standard. In solidity, the hash is computed using:

``` {.solidity}
/// @dev Get the canonical hash of an RFQ order.
/// @param order The RFQ order.
/// @return orderHash The order hash.
function getRfqOrderHash(LibNativeOrder.RfqOrder calldata order)
    external
    view
    returns (bytes32 orderHash);
```

The simplest way to generate an order hash is by calling this function,
ex:

``` {.solidity}
bytes32 orderHash = IZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF).getRfqOrderHash(order);
```

The hash can be manually generated using the following code:

``` {.solidity}
bytes32 orderHash = keccak256(abi.encodePacked(
    '\x19\x01',
    // The domain separator.
    keccak256(abi.encode(
        // The EIP712 domain separator type hash.
        keccak256(abi.encodePacked(
            'EIP712Domain(',
            'string name,',
            'string version,',
            'uint256 chainId,',
            'address verifyingContract)'
        )),
        // The EIP712 domain separator values.
        keccak256('ZeroEx'),
        keccak256('1.0.0'),
        1, // For mainnet
        0xDef1C0ded9bec7F1a1670819833240f027b25EfF, // Address of the Exchange Proxy
    )),
    // The struct hash.
    keccak256(abi.encode(
        // The EIP712 type hash.
        keccak256(abi.encodePacked(
            'RfqOrder(',
            'address makerToken,',
            'address takerToken,',
            'uint128 makerAmount,',
            'uint128 takerAmount,',
            'address maker,'
            'address taker,'
            'address txOrigin,'
            'bytes32 pool,',
            'uint64 expiry,',
            'uint256 salt)'
        )),
        // The struct values.
        order.makerToken,
        order.takerToken,
        order.makerAmount,
        order.takerAmount,
        order.maker,
        order.taker,
        order.txOrigin,
        order.pool,
        order.expiry,
        order.salt
    ))
));
```

## registerAllowedRfqOrigins

The RFQ order includes a `txOrigin` field, which a maker can use to
restrict which EOA\'s can submit the Ethereum transaction that fills
their order. There are two ways a maker can use this field.

1.  Set to the EOA that will submit the transaction (ex, the Taker or a
    Meta-Transaction relayer).
2.  Set to an EOA owned by the maker, which acts as a registry key to
    lookup valid tx origins.

Looking at the 2nd use case, a maker can register valid tx origins using
this function. They would then set `order.origin` to be the address they
used to call `registerAllowedRfqOrigins`.

``` {.solidity}
/// @dev Mark what tx.origin addresses are allowed to fill an order that
///      specifies the message sender as its txOrigin.
/// @param origins An array of origin addresses to update.
/// @param allowed True to register, false to unregister.
function registerAllowedRfqOrigins(address[] memory origins, bool allowed)
    external;
```

This function emits a
[RfqOrderOriginsAllowed](../basics/events.html#rfqorderoriginsallowed)
event.

## registerAllowedOrderSigner

Calls to fill functions require a signature provided by the maker. In
cases where the signer can\'t be the maker itself (e.g. a contract
wallet), the maker can delegate signing to another address.

To register a new delegated order signer, the maker can call
`registerAllowedOrderSigner` with `allowed == true`.

To revoke permission to a signer, the maker can call
`registerAllowedOrderSigner` with `allowed == false`.

``` {.solidity}
/// @dev Register a signer who can sign on behalf of msg.sender
///      This allows one to sign on behalf of a contract that calls this function
/// @param signer The address from which you plan to generate signatures
/// @param allowed True to register, false to unregister.
function registerAllowedOrderSigner(
    address signer,
    bool allowed
)
    external;
```

This function emits an
[OrderSignerRegistered](../basics/events.html#ordersignerregistered)
event.

## isValidOrderSigner

Returns whether the `signer` is allowed to sign orders on behalf of the
`maker`.

``` {.solidity}
/// @dev checks if a given address is registered to sign on behalf of a maker address
/// @param maker The maker address encoded in an order (can be a contract)
/// @param signer The address that is providing a signature
function isValidOrderSigner(
    address maker,
    address signer
)
    external
    view
    returns (bool isAllowed);
```

# Protocol Fees

There is a fixed protocol fee paid by the Taker each time they fill a
[Limit Order](orders.html#limit-orders). Learn more in the [Protocol
Fees Section](./protocol_fees.html). Also check out our research in the
[Tokenomics Section](../tokenomics/research.html).

## getProtocolFeeMultiplier

Takers of limit orders pay a protocol fee of Multiplier \* tx.gasprice.
This returns the Multiplier.

``` {.solidity}
/// @dev Get the protocol fee multiplier. This should be multiplied by the
///      gas price to arrive at the required protocol fee to fill a native order.
/// @return multiplier The protocol fee multiplier.
function getProtocolFeeMultiplier()
    external
    view
    returns (uint32 multiplier);
```

## transferProtocolFeesForPools

This function transfers protocol fees from [Fee
Collectors](../architecture/fee_collectors.html) to the [Staking
System](../tokenomics/staking.html).

``` {.solidity}
/// @dev Transfers protocol fees from the `FeeCollector` pools into
///      the staking contract.
/// @param poolIds Staking pool IDs
function transferProtocolFeesForPools(bytes32[] calldata poolIds)
    external;
```
