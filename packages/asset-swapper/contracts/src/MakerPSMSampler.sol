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

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "./DeploymentConstants.sol";
import "./ApproximateBuys.sol";
import "./SamplerUtils.sol";

interface IPSM {
    // @dev Get the fee for selling USDC to DAI in PSM
    // @return tin toll in [wad]
    function tin() external view returns (uint256);
    // @dev Get the fee for selling DAI to USDC in PSM
    // @return tout toll out [wad]
    function tout() external view returns (uint256);

    // @dev Get the address of the PSM state Vat
    // @return address of the Vat
    function vat() external view returns (address);

    // @dev Get the address of the underlying vault powering PSM
    // @return address of gemJoin contract
    function gemJoin() external view returns (address);

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

contract MakerPSMSampler is
    DeploymentConstants,
    SamplerUtils,
    ApproximateBuys
{
    using LibSafeMathV06 for uint256;

    /// @dev Information about which PSM module to use
    struct MakerPsmInfo {
        address psmAddress;
        bytes32 ilkIdentifier;
        address gemTokenAddress;
    }

    /// @dev Gas limit for MakerPsm calls.
    uint256 constant private MAKER_PSM_CALL_GAS = 300e3; // 300k


    // Maker units
    // wad: fixed point decimal with 18 decimals (for basic quantities, e.g. balances)
    uint256 constant private WAD = 10 ** 18;
    // ray: fixed point decimal with 27 decimals (for precise quantites, e.g. ratios)
    uint256 constant private RAY = 10 ** 27;
    // rad: fixed point decimal with 45 decimals (result of integer multiplication with a wad and a ray)
    uint256 constant private RAD = 10 ** 45;
    // See https://github.com/makerdao/dss/blob/master/DEVELOPING.m

    uint256 constant private MAX_INT = uint256(-1);

    /// @dev Sample sell quotes from Maker PSM
    function sampleSellsFromMakerPsm(
        MakerPsmInfo memory psmInfo,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        view
        returns (uint256[] memory makerTokenAmounts)
    {
        _assertValidPair(makerToken, takerToken);
        IPSM psm = IPSM(psmInfo.psmAddress);
        IVAT vat = IVAT(psm.vat());

        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);

        for (uint256 i = 0; i < numSamples; i++) {
            uint256 buyAmount = _samplePSMSell(psmInfo, makerToken, takerToken, takerTokenAmounts[i], psm, vat);

            if (buyAmount == 0) {
                break;
            }
            makerTokenAmounts[i] = buyAmount;
        }
    }

    function sampleBuysFromMakerPsm(
        MakerPsmInfo memory psmInfo,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        view
        returns (uint256[] memory takerTokenAmounts)
    {
        _assertValidPair(makerToken, takerToken);
        IPSM psm = IPSM(psmInfo.psmAddress);
        IVAT vat = IVAT(psm.vat());

        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            uint256 sellAmount = _samplePSMBuy(psmInfo, makerToken, takerToken, makerTokenAmounts[i], psm, vat);

            if (sellAmount == MAX_INT) {
                break;
            }

            takerTokenAmounts[i] = sellAmount;
        }

    }

    function _samplePSMSell(MakerPsmInfo memory psmInfo, address makerToken, address takerToken, uint256 takerTokenAmount, IPSM psm, IVAT vat)
        private
        view
        returns (uint256)
    {
        (uint256 totalDebtInWad,,, uint256 debtCeilingInRad, uint256 debtFloorInRad) = vat.ilks(psmInfo.ilkIdentifier);
        if (takerToken == psmInfo.gemTokenAddress) {
            // Simulate sellGem
            // Selling USDC to the PSM, increasing the total debt by takerTokenAmount
            // Convert USDC 6 decimals to 18 decimals [wad]
            uint256 takerTokenAmountInWad = takerTokenAmount.safeMul(1e12);
            uint256 newTotalDebtInRad = totalDebtInWad.safeAdd(takerTokenAmountInWad).safeMul(RAY);

            // PSM is too full to fit
            if (newTotalDebtInRad >= debtCeilingInRad) {
                return 0;
            }

            uint256 feeInWad = takerTokenAmountInWad.safeMul(psm.tin());
            uint256 daiAmountToReceiveInWad = takerTokenAmountInWad.safeSub(feeInWad);

            return daiAmountToReceiveInWad;
        } else if (makerToken == psmInfo.gemTokenAddress) {
            // Simulate buyGem
            // Buying USDC from the PSM, decreasing the total debt by takerTokenAmount
            // Selling DAI for USDC, already in 18 decimals [wad]
            uint256 takerTokenAmountInWad = takerTokenAmount;
            uint256 newTotalDebtInRad = totalDebtInWad.safeSub(takerTokenAmountInWad).safeMul(RAY);

            // PSM is empty, not enough USDC to buy from it
            if (newTotalDebtInRad <= debtFloorInRad) {
                return 0;
            }

            uint256 feeDivisorInWad = WAD.safeAdd(psm.tout()); // eg. 1.001 * 10 ** 18 with 0.1% tout;
            uint256 buyTokenBaseUnit = uint256(1e6);
            uint256 gemAmountToReceive =  takerTokenAmountInWad.safeMul(buyTokenBaseUnit).safeDiv(feeDivisorInWad);

            return gemAmountToReceive;
        }

        return 0;
    }

    function _samplePSMBuy(MakerPsmInfo memory psmInfo, address makerToken, address takerToken, uint256 makerTokenAmount, IPSM psm, IVAT vat)
        private
        view
        returns (uint256)
    {
        (uint256 totalDebtInWad,,, uint256 debtCeilingInRad, uint256 debtFloorInRad) = vat.ilks(psmInfo.ilkIdentifier);
        if (takerToken == psmInfo.gemTokenAddress) {
            // Simulate sellGem
            // Buying DAI with USDC, increasing the total debt
            uint256 makerTokenAmountInWad = makerTokenAmount;
            uint256 newTotalDebtInRad = totalDebtInWad.safeAdd(makerTokenAmountInWad).safeMul(RAY);

            // PSM is too full to fit
            if (newTotalDebtInRad >= debtCeilingInRad) {
                return MAX_INT;
            }

            uint256 feeDivisorInWad = WAD.safeSub(psm.tin()); // eg. 0.999 * 10 ** 18 with 0.1% tin

            uint256 usdcAmountToPay = makerTokenAmountInWad.safeMul(1e6).safeDiv(feeDivisorInWad);
            return usdcAmountToPay;
        } else if (makerToken == psmInfo.gemTokenAddress) {
            // Simulate buyGem
            // 100 DAI + 1% * 100 DAI = 101
            uint256 makerTokenAmountInWad =  makerTokenAmount.safeMul(1e12);
            uint256 newTotalDebtInRad = totalDebtInWad.safeSub(makerTokenAmountInWad).safeMul(RAY);

            // PSM is empty, not enough USDC to buy from it
            if (newTotalDebtInRad <= debtFloorInRad) {
                return MAX_INT;
            }

            uint256 feeMultiplierInWad = WAD.safeAdd(psm.tout()); // eg. 1.001 * 10 ** 18 with 0.1% tout

            uint256 daiAmountToPay = makerTokenAmountInWad.safeMul(feeMultiplierInWad);

            return daiAmountToPay;
        }

        return MAX_INT;
    }

}
