pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "./interfaces/IPlatypus.sol";
import "./ApproximateBuys.sol";
import "./SamplerUtils.sol";

contract PlatypusSampler is SamplerUtils, ApproximateBuys {
    function sampleSellsFromPlatypus(
        address pool,
        address[] memory path,
        uint256[] memory takerTokenAmounts
    ) public view returns (uint256[] memory makerTokenAmounts) {
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            try IPlatypus(pool).quotePotentialSwap(path[0], path[1], takerTokenAmounts[i]) returns (
                uint256 amountAfterFees,
                uint256 feeAmount
            ) {
                makerTokenAmounts[i] = amountAfterFees;
                // Break early if there are 0 amounts
                if (makerTokenAmounts[i] == 0) {
                    break;
                }
            } catch (bytes memory result) {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }

    function sampleBuysFromPlatypus(
        address pool,
        address[] memory path,
        uint256[] memory makerTokenAmounts
    ) public view returns (uint256[] memory takerTokenAmounts) {
        address[] memory invertBuyPath = new address[](2);
        invertBuyPath[0] = path[1];
        invertBuyPath[1] = path[0];
        return
            _sampleApproximateBuys(
                ApproximateBuyQuoteOpts({
                    makerTokenData: abi.encode(pool, invertBuyPath),
                    takerTokenData: abi.encode(pool, path),
                    getSellQuoteCallback: _sampleSellForApproximateBuyFromPlatypus
                }),
                makerTokenAmounts
            );
    }

    function _sampleSellForApproximateBuyFromPlatypus(
        bytes memory makerTokenData,
        bytes memory takerTokenData,
        uint256 sellAmount
    ) private view returns (uint256 buyAmount) {
        (address _pool, address[] memory _path) = abi.decode(makerTokenData, (address, address[]));

        (bool success, bytes memory resultData) = address(this).staticcall(
            abi.encodeWithSelector(this.sampleSellsFromPlatypus.selector, _pool, _path, _toSingleValueArray(sellAmount))
        );
        if (!success) {
            return 0;
        }
        // solhint-disable-next-line indent
        return abi.decode(resultData, (uint256[]))[0];
    }
}
