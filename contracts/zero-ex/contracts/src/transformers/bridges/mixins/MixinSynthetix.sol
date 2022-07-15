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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

interface ISynthetix {
    // Ethereum Mainnet
    function exchangeAtomically(
        bytes32 sourceCurrencyKey,
        uint256 sourceAmount,
        bytes32 destinationCurrencyKey,
        bytes32 trackingCode,
        uint256 minAmount
    ) external returns (uint256 amountReceived);

    // Optimism
    function exchangeWithTracking(
        bytes32 sourceCurrencyKey,
        uint256 sourceAmount,
        bytes32 destinationCurrencyKey,
        address rewardAddress,
        bytes32 trackingCode
    ) external returns (uint256 amountReceived);
}

interface IReadProxyAddressResolver {
    function target() external view returns (address);
}

interface IAddressResolver {
    function getAddress(bytes32 name) external view returns (address);
}

contract MixinSynthetix {
    IReadProxyAddressResolver private constant readProxyEthereum =
        IReadProxyAddressResolver(0x4E3b31eB0E5CB73641EE1E65E7dCEFe520bA3ef2);
    IReadProxyAddressResolver private constant readProxyOptimism =
        IReadProxyAddressResolver(0x1Cb059b7e74fD21665968C908806143E744D5F30);

    // TODO(kyu): update reward address
    address private constant rewardAddress =
        0x0000000000000000000000000000000000000000;
    bytes32 constant trackingCode =
        0x3058000000000000000000000000000000000000000000000000000000000000;

    function _tradeSynthetix(uint256 sellAmount, bytes memory bridgeData)
        public
        returns (uint256 boughtAmount)
    {
        (bytes32 sourceCurrencyKey, bytes32 destinationCurrencyKey) = abi
            .decode(bridgeData, (bytes32, bytes32));

        boughtAmount = exchange(
            sourceCurrencyKey,
            destinationCurrencyKey,
            sellAmount
        );
    }

    function exchange(
        bytes32 sourceCurrencyKey,
        bytes32 destinationCurrencyKey,
        uint256 sellAmount
    ) internal returns (uint256 boughtAmount) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }

        if (chainId == 1) {
            ISynthetix synthetix = getSynthetix(readProxyEthereum);
            boughtAmount = synthetix.exchangeAtomically(
                sourceCurrencyKey,
                sellAmount,
                destinationCurrencyKey,
                trackingCode,
                0
            );
        } else {
            ISynthetix synthetix = getSynthetix(readProxyOptimism);
            boughtAmount = synthetix.exchangeWithTracking(
                sourceCurrencyKey,
                sellAmount,
                destinationCurrencyKey,
                rewardAddress,
                trackingCode
            );
        }
    }

    function getSynthetix(IReadProxyAddressResolver readProxy)
        private
        view
        returns (ISynthetix)
    {
        return
            ISynthetix(
                IAddressResolver(readProxy.target()).getAddress("Synthetix")
            );
    }
}
