// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6;
pragma experimental ABIEncoderV2;
import "./SamplerUtils.sol";
import "./ApproximateBuys.sol";

interface IWooPP {
    /// @dev get the quote token address (immutable)
    /// @return address of quote token
    function quoteToken() external view returns (address);

    /// @dev Query the amount for selling the base token amount.
    /// @param baseToken the base token to sell
    /// @param baseAmount the amount to sell
    /// @return quoteAmount the swapped quote amount
    function querySellBase(address baseToken, uint256 baseAmount) external view returns (uint256 quoteAmount);

    /// @dev Query the amount for selling the quote token.
    /// @param baseToken the base token to receive (buy)
    /// @param quoteAmount the amount to sell
    /// @return baseAmount the swapped base token amount
    function querySellQuote(address baseToken, uint256 quoteAmount) external view returns (uint256 baseAmount);
}

contract WooPPSampler is SamplerUtils, ApproximateBuys {
    function query(
        uint256 amountIn,
        address tokenIn,
        address tokenOut,
        address pool
    ) internal view returns (uint256 amountOut) {
        if (amountIn == 0) {
            return 0;
        }
        address quoteToken = IWooPP(pool).quoteToken();
        if (tokenIn == quoteToken) {
            amountOut = IWooPP(pool).querySellQuote(tokenOut, amountIn);
        } else if (tokenOut == quoteToken) {
            amountOut = IWooPP(pool).querySellBase(tokenIn, amountIn);
        } else {
            uint256 quoteAmount = IWooPP(pool).querySellBase(tokenIn, amountIn);
            amountOut = IWooPP(pool).querySellQuote(tokenOut, quoteAmount);
        }
    }

    /// @dev Sample sell quotes from WooFI.
    /// @param pool Address of the pool we are sampling from
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample (sorted in ascending order).
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromWooPP(
        address pool,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    ) public view returns (uint256[] memory makerTokenAmounts) {
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            makerTokenAmounts[i] = query(takerTokenAmounts[i], takerToken, makerToken, pool);

            if (makerTokenAmounts[i] == 0) {
                break;
            }
        }
    }

    /// @dev Sample buy quotes from WooFI.
    /// @param pool Address of the pool we are sampling from
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token sell amount for each sample (sorted in ascending order).
    /// @return takerTokenAmounts Taker amounts bought at each taker token
    ///         amount.
    function sampleBuysFromWooPP(
        address pool,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    ) public view returns (uint256[] memory takerTokenAmounts) {
        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = _sampleApproximateBuys(
            ApproximateBuyQuoteOpts({
                takerTokenData: abi.encode(pool, takerToken, makerToken),
                makerTokenData: abi.encode(pool, makerToken, takerToken),
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
        (address _pool, address _takerToken, address _makerToken) = abi.decode(
            takerTokenData,
            (address, address, address)
        );
        (bool success, bytes memory resultData) = address(this).staticcall(
            abi.encodeWithSelector(
                this.sampleSellsFromWooPP.selector,
                _pool,
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
