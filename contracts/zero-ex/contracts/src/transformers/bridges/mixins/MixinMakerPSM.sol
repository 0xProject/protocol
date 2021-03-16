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

import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";

interface IPSM {
    // @dev Get the fee for selling USDC to DAI in PSM
    // @return tin toll in [wad]
    function tin() external view returns (uint256);
    // @dev Get the fee for selling DAI to USDC in PSM
    // @return tout toll out [wad]
    function tout() external view returns (uint256);
    // @dev Sell USDC for DAI
    // @param usr The address of the account trading USDC for DAI.
    // @param gemAmt The amount of USDC to sell in USDC base units
    function sellGem(
        address usr,
        uint256 gemAmt
    ) external;
    // @dev Buy USDC for DAI
    // @param usr The address of the account trading DAI for USDC
    // @param gemAmt The amount of USDC to buy in USDC base units
    function buyGem(
        address usr,
        uint256 gemAmt
    ) external;
}

interface IVAT {
    // @dev Get a collateral type by identifier
    // @param ilkIdentifier bytes32 identifier. Example: ethers.utils.formatBytes32String("PSM-USDC-A")
    // @return ilk
    // @return ilk.Art Total Normalised Debt in wad
    // @return ilk.rate Accumulated Rates in ray
    // @return ilk.spot Price with Safety Margin in ray
    // @return ilk.line Debt Ceiling in rad
    // @return ilk.dust Urn Debt Floor in rad
    function ilks(
        bytes32 ilkIdentifier
    ) external view returns (
        uint256 Art,
        uint256 rate,
        uint256 spot,
        uint256 line,
        uint256 dust
    );
}




contract MixinMakerPSM {

    using LibERC20TokenV06 for IERC20TokenV06;
    using LibSafeMathV06 for uint256;

    struct MakerPSMBridgeData {
        address psmAddress;
        address vatAddress;
        address authGemAddress;
        bool isSellGem;
    }

    // Maker units
    // wad: fixed point decimal with 18 decimals (for basic quantities, e.g. balances)
    uint256 WAD = 10 ** 18;
    // ray: fixed point decimal with 27 decimals (for precise quantites, e.g. ratios)
    uint256 RAY = 10 ** 27;
    // rad: fixed point decimal with 45 decimals (result of integer multiplication with a wad and a ray)
    uint256 RAD = 10 ** 45;
    // See https://github.com/makerdao/dss/blob/master/DEVELOPING.md

    function _tradeMakerPSM(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        // Decode the bridge data.
        MakerPSMBridgeData memory data = abi.decode(bridgeData, (MakerPSMBridgeData));
        uint256 beforeBalance = buyToken.balanceOf(address(this));

        IPSM psm = IPSM(data.psmAddress);

        if (data.isSellGem == true) {
            sellToken.approveIfBelow(
                data.authGemAddress,
                sellAmount
            );

            psm.sellGem(address(this), sellAmount);
        } else {
            uint256 feeDivisor = WAD.safeAdd(psm.tout()); // eg. 1.001 * 10 ** 18 with 0.1% tout;
            uint256 buyTokenBaseUnit = uint256(10) ** buyToken.decimals();
            uint256 gemAmount =  sellAmount.safeMul(buyTokenBaseUnit).safeDiv(feeDivisor);

            sellToken.approveIfBelow(
                data.psmAddress,
                sellAmount
            );
            psm.buyGem(address(this), gemAmount);
        }

        return buyToken.balanceOf(address(this)).safeSub(beforeBalance);
    }
}
