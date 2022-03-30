pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "./interfaces/IGMX.sol";


contract GMXSampler
{
    /// @dev Gas limit for UniswapV2 calls.

    function sampleSellsFromGMX(
        address reader,
        address vault,
        address[] memory path,
        uint256[] memory takerTokenAmounts
    )
        public
        view
        returns (uint256[] memory makerTokenAmounts)
    {
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            try
                IGMX(reader).getAmountOut(IVault(vault), path[0], path[1], takerTokenAmounts[i])
                returns (uint256 amountAfterFees, uint256 feeAmount)
            {
                makerTokenAmounts[i] = amountAfterFees;
                // Break early if there are 0 amounts
                if (makerTokenAmounts[i] == 0) {
                    break;
                }
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }

}