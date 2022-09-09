pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "./interfaces/IGMX.sol";
import "./ApproximateBuys.sol";
import "./SamplerUtils.sol";

contract GMXSampler is SamplerUtils, ApproximateBuys {
    struct GMXInfo {
        address reader;
        address vault;
        address[] path;
    }

    function sampleSellsFromGMX(
        IGMX reader,
        address vault,
        address[] memory path,
        uint256[] memory takerTokenAmounts
    ) public view returns (uint256[] memory makerTokenAmounts) {
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            try IGMX(reader).getMaxAmountIn(IVault(vault), path[0], path[1]) returns (uint256 maxAmountIn) {
                // Break early if GMX does not have enough liquidity to perform the swap
                if (takerTokenAmounts[i] > maxAmountIn) {
                    break;
                }
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
                break;
            }
            try IGMX(reader).getAmountOut(IVault(vault), path[0], path[1], takerTokenAmounts[i]) returns (
                uint256 amountAfterFees,
                uint256 feeAmount
            ) {
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

    function sampleBuysFromGMX(
        IGMX reader,
        address vault,
        address[] memory path,
        uint256[] memory makerTokenAmounts
    ) public view returns (uint256[] memory takerTokenAmounts) {
        address[] memory invertBuyPath = new address[](2);
        invertBuyPath[0] = path[1];
        invertBuyPath[1] = path[0];
        return
            _sampleApproximateBuys(
                ApproximateBuyQuoteOpts({
                    makerTokenData: abi.encode(address(reader), vault, invertBuyPath),
                    takerTokenData: abi.encode(address(reader), vault, path),
                    getSellQuoteCallback: _sampleSellForApproximateBuyFromGMX
                }),
                makerTokenAmounts
            );
    }

    function _sampleSellForApproximateBuyFromGMX(
        bytes memory takerTokenData,
        bytes memory makerTokenData,
        uint256 sellAmount
    ) private view returns (uint256 buyAmount) {
        (address _reader, address _vault, address[] memory _path) = abi.decode(
            takerTokenData,
            (address, address, address[])
        );

        (bool success, bytes memory resultData) = address(this).staticcall(
            abi.encodeWithSelector(
                this.sampleSellsFromGMX.selector,
                _reader,
                _vault,
                _path,
                _toSingleValueArray(sellAmount)
            )
        );
        if (!success) {
            return 0;
        }
        // solhint-disable-next-line indent
        return abi.decode(resultData, (uint256[]))[0];
    }
}
