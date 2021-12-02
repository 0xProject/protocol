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
import "../../vendor/IERC721Token.sol";
import "../../vendor/IPropertyValidator.sol";


/// @dev A library for common ERC721 order operations.
library LibERC721Order {
    using LibSafeMathV06 for uint256;
    using LibRichErrorsV06 for bytes;

    enum OrderStatus {
        INVALID,
        FILLABLE,
        UNFILLABLE,
        EXPIRED
    }

    enum TradeDirection {
        SELL_721,
        BUY_721
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

    /// @dev An ERC721<>ERC20 limit order.
    struct ERC721Order {
        TradeDirection direction;
        IERC20TokenV06 erc20Token;
        uint256 erc20TokenAmount;
        IERC721Token erc721Token;
        uint256 erc721TokenId;
        Property[] erc721TokenProperties;
        Fee[] fees;
        address maker;
        address taker;
        uint256 expiry;
        uint256 nonce;
    }

    // The type hash for ERC721 orders, which is:
    // keccak256(abi.encodePacked(
    //     "ERC721Order(",
    //       "uint8 direction,",
    //       "address erc20Token,",
    //       "uint256 erc20TokenAmount,",
    //       "address erc721Token,",
    //       "uint256 erc721TokenId,",
    //       "Property[] erc721TokenProperties,",
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
    uint256 private constant _ERC_721_ORDER_TYPEHASH =
        0x7af652c2504c5c7d806f4f25edc3762dd8478099f694981f8802db656a9ba9d8;

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
    bytes32 private constant _NULL_KECCAK256 = 
        0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;        

    /// @dev Get the struct hash of an ERC721 order.
    /// @param order The ERC721 order.
    /// @return structHash The struct hash of the order.
    function getERC721OrderStructHash(ERC721Order memory order)
        internal
        pure
        returns (bytes32 structHash)
    {
        // TODO: Verify EIP-712 behavior for array of structs
        // TODO: Rewrite in assembly to hash in place

        // We give `order.erc721TokenProperties.length == 0` and 
        // `order.erc721TokenProperties.length == 1` special treatment
        // because we expect these to be the most common.
        bytes32 propertiesHash;
        if (order.erc721TokenProperties.length == 0) {
            propertiesHash = _NULL_KECCAK256;
        } else if (order.erc721TokenProperties.length == 1) {
            // TODO: Maybe introduce yet another case here for if 
            // propertyValidator == 0 and propertyData == 0. Should be 
            // a particularly common use case that we can optimize for.
            propertiesHash = keccak256(abi.encodePacked(keccak256(abi.encode(
                _PROPERTY_TYPEHASH,
                order.erc721TokenProperties[0].propertyValidator,
                keccak256(order.erc721TokenProperties[0].propertyData)
            ))));
        } else {
            bytes32[] memory propertyStructHashArray = new bytes32[](
                order.erc721TokenProperties.length
            );
            for (uint256 i = 0; i < order.erc721TokenProperties.length; i++) {
                propertyStructHashArray[i] = keccak256(abi.encode(
                    _PROPERTY_TYPEHASH,
                    order.erc721TokenProperties[i].propertyValidator,
                    keccak256(order.erc721TokenProperties[i].propertyData)
                ));
            }
            propertiesHash = keccak256(abi.encodePacked(propertyStructHashArray));
        }

        // We give `order.fees.length == 0` and 
        // `order.fees.length == 1` special treatment
        // because we expect these to be the most common.
        bytes32 feesHash;
        if (order.fees.length == 0) {
            feesHash = _NULL_KECCAK256;
        } else if (order.fees.length == 1) {
            feesHash = keccak256(abi.encodePacked(keccak256(abi.encode(
                _FEE_TYPEHASH,
                order.fees[0].recipient,
                order.fees[0].amount,
                keccak256(order.fees[0].feeData)
            ))));
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

        return keccak256(abi.encode(
            _ERC_721_ORDER_TYPEHASH,
            order.direction,
            order.erc20Token,
            order.erc20TokenAmount,
            order.erc721Token,
            order.erc721TokenId,
            propertiesHash,
            feesHash,
            order.maker,
            order.taker,
            order.expiry,
            order.nonce
        ));
    }
}
