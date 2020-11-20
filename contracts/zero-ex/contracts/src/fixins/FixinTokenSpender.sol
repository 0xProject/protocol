/*

  Copyright 2020 ZeroEx Intl.

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

import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "../features/ITokenSpenderFeature.sol";
import "../errors/LibSpenderRichErrors.sol";
import "../external/FeeCollector.sol";
import "../vendor/v3/IStaking.sol";
import "../vendor/v3/IStaking.sol";


/// @dev Helpers for moving tokens around.
abstract contract FixinTokenSpender {
    using LibRichErrorsV06 for bytes;

    // Mask of the lower 20 bytes of a bytes32.
    uint256 constant private ADDRESS_MASK = 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff;
    /// @dev A bloom filter for tokens that consume all gas when `transferFrom()` fails.
    bytes32 public immutable GREEDY_TOKENS_BLOOM_FILTER;

    /// @param greedyTokensBloomFilter The bloom filter for all greedy tokens.
    constructor(bytes32 greedyTokensBloomFilter)
        internal
    {
        GREEDY_TOKENS_BLOOM_FILTER = greedyTokensBloomFilter;
    }

    /// @dev Transfers ERC20 tokens from `owner` to `to`.
    /// @param token The token to spend.
    /// @param owner The owner of the tokens.
    /// @param to The recipient of the tokens.
    /// @param amount The amount of `token` to transfer.
    function _transferERC20Tokens(
        IERC20TokenV06 token,
        address owner,
        address to,
        uint256 amount
    )
        internal
    {
        bool success;
        bytes memory revertData;

        require(address(token) != address(this), "FixinTokenSpender/CANNOT_INVOKE_SELF");

        // If the token eats all gas when failing, we do not want to perform
        // optimistic fall through to the old AllowanceTarget contract if the
        // direct transferFrom() fails.
        if (_isTokenPossiblyGreedy(token)) {
            // If the token does not have a direct allowance on us then we use
            // the allowance target.
            if (token.allowance(owner, address(this)) < amount) {
                _transferFromLegacyAllowanceTarget(
                    token,
                    owner,
                    to,
                    amount,
                    ""
                );
                return;
            }
        }

        assembly {
            let ptr := mload(0x40) // free memory pointer

            // selector for transferFrom(address,address,uint256)
            mstore(ptr, 0x23b872dd00000000000000000000000000000000000000000000000000000000)
            mstore(add(ptr, 0x04), and(owner, ADDRESS_MASK))
            mstore(add(ptr, 0x24), and(to, ADDRESS_MASK))
            mstore(add(ptr, 0x44), amount)

            success := call(
                gas(),
                and(token, ADDRESS_MASK),
                0,
                ptr,
                0x64,
                0,
                0
            )

            let rdsize := returndatasize()

            returndatacopy(add(ptr, 0x20), 0, rdsize) // reuse memory

            // Check for ERC20 success. ERC20 tokens should return a boolean,
            // but some don't. We accept 0-length return data as success, or at
            // least 32 bytes that starts with a 32-byte boolean true.
            success := and(
                success,                             // call itself succeeded
                or(
                    iszero(rdsize),                  // no return data, or
                    and(
                        iszero(lt(rdsize, 32)),      // at least 32 bytes
                        eq(mload(add(ptr, 0x20)), 1) // starts with uint256(1)
                    )
                )
            )

            if iszero(success) {
                // revertData is a bytes, so length-prefixed data
                mstore(ptr, rdsize)
                revertData := ptr

                // update free memory pointer (ptr + 32-byte length + return data)
                mstore(0x40, add(add(ptr, 0x20), rdsize))
            }
        }

        if (!success) {
            _transferFromLegacyAllowanceTarget(
                token,
                owner,
                to,
                amount,
                revertData
            );
        }
    }

    /// @dev Gets the maximum amount of an ERC20 token `token` that can be
    ///      pulled from `owner` by this address.
    /// @param token The token to spend.
    /// @param owner The owner of the tokens.
    /// @return amount The amount of tokens that can be pulled.
    function _getSpendableERC20BalanceOf(
        IERC20TokenV06 token,
        address owner
    )
        internal
        view
        returns (uint256)
    {
        return LibSafeMathV06.min256(
            token.allowance(owner, address(this)),
            token.balanceOf(owner)
        );
    }

    /// @dev Check if a token possibly belongs to the `GREEDY_TOKENS_BLOOM_FILTER`
    ///      bloom filter.
    function _isTokenPossiblyGreedy(IERC20TokenV06 token)
        internal
        view
        returns (bool isPossiblyGreedy)
    {
        // The hash is given by:
        // (1 << (keccak256(token) % 256)) | (1 << (token % 256))
        bytes32 h;
        assembly {
            mstore(0, token)
            h := or(shl(mod(keccak256(0, 32), 256), 1), shl(mod(token, 256), 1))
        }
        return (h & GREEDY_TOKENS_BLOOM_FILTER) == h;
    }

    /// @dev Transfer tokens using the legacy allowance target instead of
    ///      allowances directly set on the exchange proxy.
    function _transferFromLegacyAllowanceTarget(
        IERC20TokenV06 token,
        address owner,
        address to,
        uint256 amount,
        bytes memory initialRevertData
    )
        private
    {
        // Try the old AllowanceTarget.
        try ITokenSpenderFeature(address(this))._spendERC20Tokens(
                token,
                owner,
                to,
                amount
            ) {
        } catch (bytes memory revertData) {
            // Bubble up the first error message. (In general, the fallback to the
            // allowance target is opportunistic. We ignore the specific error
            // message if it fails.)
            LibSpenderRichErrors.SpenderERC20TransferFromFailedError(
                address(token),
                owner,
                to,
                amount,
                initialRevertData.length != 0 ? initialRevertData : revertData
            ).rrevert();
        }
    }
}
