// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2022 ZeroEx Intl.

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

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

interface IReadProxyAddressResolver {
    function target() external view returns (address);
}

interface IAddressResolver {
    function getAddress(bytes32 name) external view returns (address);
}

interface IExchanger {
    // Ethereum Mainnet
    function getAmountsForAtomicExchange(
        uint256 sourceAmount,
        bytes32 sourceCurrencyKey,
        bytes32 destinationCurrencyKey
    ) external view returns (uint256 amountReceived, uint256 fee, uint256 exchangeFeeRate);

    // Optimism
    function getAmountsForExchange(
        uint256 sourceAmount,
        bytes32 sourceCurrencyKey,
        bytes32 destinationCurrencyKey
    ) external view returns (uint256 amountReceived, uint256 fee, uint256 exchangeFeeRate);
}

contract SynthetixSampler {
    /// @dev Sample sell quotes from Synthetix Atomic Swap.
    /// @param takerTokenSymbol Symbol (currency key) of the taker token (what to sell).
    /// @param makerTokenSymbol Symbol (currency key) of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample (sorted in ascending order).
    /// @return synthetix Synthetix address.
    /// @return makerTokenAmounts Maker amounts bought at each taker token amount.
    function sampleSellsFromSynthetix(
        IReadProxyAddressResolver readProxy,
        bytes32 takerTokenSymbol,
        bytes32 makerTokenSymbol,
        uint256[] memory takerTokenAmounts
    ) public view returns (address synthetix, uint256[] memory makerTokenAmounts) {
        synthetix = getSynthetixAddress(readProxy);
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        if (numSamples == 0) {
            return (synthetix, makerTokenAmounts);
        }

        makerTokenAmounts[0] = exchange(readProxy, takerTokenAmounts[0], takerTokenSymbol, makerTokenSymbol);

        // Synthetix atomic swap has a fixed rate. Calculate the rest based on the first value (and save gas).
        for (uint256 i = 1; i < numSamples; i++) {
            makerTokenAmounts[i] = (makerTokenAmounts[0] * takerTokenAmounts[i]) / takerTokenAmounts[0];
        }
    }

    /// @dev Sample buy quotes from Synthetix Atomic Swap.
    /// @param takerTokenSymbol Symbol (currency key) of the taker token (what to sell).
    /// @param makerTokenSymbol Symbol (currency key) of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token buy amount for each sample (sorted in ascending order).
    /// @return synthetix Synthetix address.
    /// @return takerTokenAmounts Taker amounts sold at each maker token amount.
    function sampleBuysFromSynthetix(
        IReadProxyAddressResolver readProxy,
        bytes32 takerTokenSymbol,
        bytes32 makerTokenSymbol,
        uint256[] memory makerTokenAmounts
    ) public view returns (address synthetix, uint256[] memory takerTokenAmounts) {
        synthetix = getSynthetixAddress(readProxy);
        // Since Synthetix atomic have a fixed rate, we can pick any reasonablely size takerTokenAmount (fixed to 1 ether here) and calculate the rest.
        uint256 amountReceivedForEther = exchange(readProxy, 1 ether, takerTokenSymbol, makerTokenSymbol);

        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);

        for (uint256 i = 0; i < numSamples; i++) {
            takerTokenAmounts[i] = (1 ether * makerTokenAmounts[i]) / amountReceivedForEther;
        }
    }

    function exchange(
        IReadProxyAddressResolver readProxy,
        uint256 sourceAmount,
        bytes32 sourceCurrencyKey,
        bytes32 destinationCurrencyKey
    ) private view returns (uint256 amountReceived) {
        IExchanger exchanger = getExchanger(readProxy);
        uint256 chainId;
        assembly {
            chainId := chainid()
        }

        if (chainId == 1) {
            (amountReceived, , ) = exchanger.getAmountsForAtomicExchange(
                sourceAmount,
                sourceCurrencyKey,
                destinationCurrencyKey
            );
        } else {
            (amountReceived, , ) = exchanger.getAmountsForExchange(
                sourceAmount,
                sourceCurrencyKey,
                destinationCurrencyKey
            );
        }
    }

    function getSynthetixAddress(IReadProxyAddressResolver readProxy) private view returns (address) {
        return IAddressResolver(readProxy.target()).getAddress("Synthetix");
    }

    function getExchanger(IReadProxyAddressResolver readProxy) private view returns (IExchanger) {
        return IExchanger(IAddressResolver(readProxy.target()).getAddress("Exchanger"));
    }
}
