// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6;
pragma experimental ABIEncoderV2;
import "./SamplerUtils.sol";
import "./ApproximateBuys.sol";

interface IWooPP {
    /// @dev query the amount to swap fromToken -> toToken
    /// @param fromToken the from token
    /// @param toToken the to token
    /// @param fromAmount the amount of fromToken to swap
    /// @return toAmount the predicted amount to receive
    function querySwap(address fromToken, address toToken, uint256 fromAmount) external view returns (uint256 toAmount);
}

contract WooPPSampler is SamplerUtils, ApproximateBuys {
    /// @dev Sample sell quotes from WooFI.
    /// @param router Address of the router we are sampling from
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample (sorted in ascending order).
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromWooPP(
        IWooPP router,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    ) public view returns (uint256[] memory makerTokenAmounts) {
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            makerTokenAmounts[i] = router.querySwap(takerToken, makerToken, takerTokenAmounts[i]);
            if (makerTokenAmounts[i] == 0) {
                break;
            }
        }
    }

    /// @dev Sample buy quotes from WooFI.
    /// @param router Address of the router we are sampling from
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token sell amount for each sample (sorted in ascending order).
    /// @return takerTokenAmounts Taker amounts bought at each taker token
    ///         amount.
    function sampleBuysFromWooPP(
        IWooPP router,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    ) public view returns (uint256[] memory takerTokenAmounts) {
        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = _sampleApproximateBuys(
            ApproximateBuyQuoteOpts({
                takerTokenData: abi.encode(router, takerToken, makerToken),
                makerTokenData: abi.encode(router, makerToken, takerToken),
                getSellQuoteCallback: _sampleSellForApproximateBuyFromWoofi
            }),
            makerTokenAmounts
        );
    }

    function _sampleSellForApproximateBuyFromWoofi(
        bytes memory takerTokenData,
        bytes memory makerTokenData,
        uint256 sellAmount
    ) internal view returns (uint256) {
        (IWooPP _router, address _takerToken, address _makerToken) = abi.decode(
            takerTokenData,
            (IWooPP, address, address)
        );
        (bool success, bytes memory resultData) = address(this).staticcall(
            abi.encodeWithSelector(
                this.sampleSellsFromWooPP.selector,
                _router,
                _takerToken,
                _makerToken,
                _toSingleValueArray(sellAmount)
            )
        );
        if (!success) {
            return 0;
        }
        return abi.decode(resultData, (uint256[]))[0];
    }
}
