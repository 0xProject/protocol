// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2021 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/errors/LibRichErrorsV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "../../vendor/IERC1155Token.sol";
import "../../vendor/IPropertyValidator.sol";


/// @dev A library for common ERC1155 order operations.
library LibERC1155Order {
    using LibSafeMathV06 for uint256;
    using LibRichErrorsV06 for bytes;

    enum OrderStatus {
        INVALID,
        FILLABLE,
        CANCELLED,
        EXPIRED,
        FILLED
    }

    enum TradeDirection {
        SELL_1155,
        BUY_1155
    }

    struct Property {
        IPropertyValidator propertyValidator;
        bytes propertyData;
    }

    struct Fee {
        address recipient;
        uint256 amount;
        bytes feeData;
    }

    /// @dev An ERC1155<>ERC20 limit order.
    struct ERC1155Order {
        TradeDirection direction;
        IERC20TokenV06 erc20Token;
        uint256 erc20TokenAmount;
        IERC1155Token erc1155Token;
        uint256 erc1155TokenId;
        uint128 erc1155TokenAmount;
        Property[] erc1155TokenProperties;
        Fee[] fees;
        address maker;
        address taker;
        uint256 expiry;
        uint256 nonce;
    }

    struct OrderInfo {
        bytes32 orderHash;
        OrderStatus status;
        uint128 remainingERC1155FillableAmount;
    }

    // The type hash for ERC1155 orders, which is:
    // keccak256(abi.encodePacked(
    //     "ERC1155Order(",
    //       "uint8 direction,",
    //       "address erc20Token,",
    //       "uint256 erc20TokenAmount,",
    //       "address erc1155Token,",
    //       "uint256 erc1155TokenId,",
    //       "uint128 erc1155TokenAmount,",
    //       "Property[] erc1155TokenProperties,",
    //       "Fee[] fees,",
    //       "address maker,",
    //       "address taker,",
    //       "uint256 expiry,",
    //       "uint256 nonce",
    //     ")",
    //     "Fee(",
    //       "address recipient,",
    //       "uint256 amount,",
    //       "bytes feeData",
    //     ")",
    //     "Property(",
    //       "address propertyValidator,",
    //       "bytes propertyData",
    //     ")"
    // ))
    uint256 private constant _ERC_1155_ORDER_TYPEHASH =
        0xa3eda4c7db3c9b6e39713fae70a50e840b420b920eff22c4c6abc8e940cfac3b;

    // keccak256(abi.encodePacked(
    //     "Fee(",
    //       "address recipient,",
    //       "uint256 amount,",
    //       "bytes feeData",
    //     ")"
    // ))
    uint256 private constant _FEE_TYPEHASH =
        0xe68c29f1b4e8cce0bbcac76eb1334bdc1dc1f293a517c90e9e532340e1e94115;

    // keccak256(abi.encodePacked(
    //     "Property(",
    //       "address propertyValidator,",
    //       "bytes propertyData",
    //     ")"
    // ))
    uint256 private constant _PROPERTY_TYPEHASH =
        0x6292cf854241cb36887e639065eca63b3af9f7f70270cebeda4c29b6d3bc65e8;

    // keccak256("");
    bytes32 private constant _EMPTY_ARRAY_KECCAK256 =
        0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;

    // keccak256(abi.encodePacked(keccak256(abi.encode(
    //     _PROPERTY_TYPEHASH,
    //     address(0),
    //     keccak256("")
    // ))));
    bytes32 private constant _NULL_PROPERTY_STRUCT_HASH =
        0x720ee400a9024f6a49768142c339bf09d2dd9056ab52d20fbe7165faba6e142d;

    uint256 private constant ADDRESS_MASK = (1 << 160) - 1;

    /// @dev Get the struct hash of an ERC1155 order.
    /// @param order The ERC1155 order.
    /// @return structHash The struct hash of the order.
    function getERC1155OrderStructHash(ERC1155Order memory order)
        internal
        pure
        returns (bytes32 structHash)
    {
        // We give `order.erc1155TokenProperties.length == 0` and
        // `order.erc1155TokenProperties.length == 1` special treatment
        // because we expect these to be the most common.
        bytes32 propertiesHash;
        if (order.erc1155TokenProperties.length == 0) {
            propertiesHash = _EMPTY_ARRAY_KECCAK256;
        } else if (order.erc1155TokenProperties.length == 1) {
            Property memory property = order
                .erc1155TokenProperties[0];
            if (
                address(property.propertyValidator) == address(0) &&
                property.propertyData.length == 0
            ) {
                propertiesHash = _NULL_PROPERTY_STRUCT_HASH;
            } else {
                // propertiesHash = keccak256(abi.encodePacked(keccak256(abi.encode(
                //     _PROPERTY_TYPEHASH,
                //     order.erc1155TokenProperties[0].propertyValidator,
                //     keccak256(order.erc1155TokenProperties[0].propertyData)
                // ))));
                bytes32 dataHash = keccak256(property.propertyData);
                assembly {
                    // Load free memory pointer
                    let mem := mload(64)
                    mstore(mem, _PROPERTY_TYPEHASH)
                    // property.propertyValidator
                    mstore(add(mem, 32), and(ADDRESS_MASK, mload(property)))
                    // keccak256(property.propertyData)
                    mstore(add(mem, 64), dataHash)
                    mstore(mem, keccak256(mem, 96))
                    propertiesHash := keccak256(mem, 32)
                }
            }
        } else {
            bytes32[] memory propertyStructHashArray = new bytes32[](
                order.erc1155TokenProperties.length
            );
            for (uint256 i = 0; i < order.erc1155TokenProperties.length; i++) {
                propertyStructHashArray[i] = keccak256(abi.encode(
                    _PROPERTY_TYPEHASH,
                    order.erc1155TokenProperties[i].propertyValidator,
                    keccak256(order.erc1155TokenProperties[i].propertyData)
                ));
            }
            propertiesHash = keccak256(abi.encodePacked(propertyStructHashArray));
        }

        // We give `order.fees.length == 0` and
        // `order.fees.length == 1` special treatment
        // because we expect these to be the most common.
        bytes32 feesHash;
        if (order.fees.length == 0) {
            feesHash = _EMPTY_ARRAY_KECCAK256;
        } else if (order.fees.length == 1) {
            // feesHash = keccak256(abi.encodePacked(keccak256(abi.encode(
            //     _FEE_TYPEHASH,
            //     order.fees[0].recipient,
            //     order.fees[0].amount,
            //     keccak256(order.fees[0].feeData)
            // ))));
            Fee memory fee = order.fees[0];
            bytes32 dataHash = keccak256(fee.feeData);
            assembly {
                // Load free memory pointer
                let mem := mload(64)
                mstore(mem, _FEE_TYPEHASH)
                // fee.recipient
                mstore(add(mem, 32), and(ADDRESS_MASK, mload(fee)))
                // fee.amount
                mstore(add(mem, 64), mload(add(fee, 32)))
                // keccak256(fee.feeData)
                mstore(add(mem, 96), dataHash)
                mstore(mem, keccak256(mem, 128))
                feesHash := keccak256(mem, 32)
            }
        } else {
            bytes32[] memory feeStructHashArray = new bytes32[](order.fees.length);
            for (uint256 i = 0; i < order.fees.length; i++) {
                feeStructHashArray[i] = keccak256(abi.encode(
                    _FEE_TYPEHASH,
                    order.fees[i].recipient,
                    order.fees[i].amount,
                    keccak256(order.fees[i].feeData)
                ));
            }
            feesHash = keccak256(abi.encodePacked(feeStructHashArray));
        }

        // Hash in place, equivalent to:
        // return keccak256(abi.encode(
        //     _ERC_1155_ORDER_TYPEHASH,
        //     order.direction,
        //     order.erc20Token,
        //     order.erc20TokenAmount,
        //     order.erc1155Token,
        //     order.erc1155TokenId,
        //     order.erc1155TokenAmount,
        //     propertiesHash,
        //     feesHash,
        //     order.maker,
        //     order.taker,
        //     order.expiry,
        //     order.nonce
        // ));
        assembly {
            if lt(order, 32) { invalid() } // Don't underflow memory.

            let typeHashPos := sub(order, 32) // order + (32 * -1)
            let propertiesHashPos := add(order, 192) // order + (32 * 6)
            let feesHashPos := add(order, 224) // order + (32 * 7)

            let temp1 := mload(typeHashPos)
            let temp2 := mload(propertiesHashPos)
            let temp3 := mload(feesHashPos)

            mstore(typeHashPos, _ERC_1155_ORDER_TYPEHASH)
            mstore(propertiesHashPos, propertiesHash)
            mstore(feesHashPos, feesHash)
            structHash := keccak256(typeHashPos, 416 /* 32 * 12 */ )

            mstore(typeHashPos, temp1)
            mstore(propertiesHashPos, temp2)
            mstore(feesHashPos, temp3)
        }
        return structHash;
    }
}
