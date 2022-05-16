pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "./interfaces/IPlatypus.sol";
import "./ApproximateBuys.sol";
import "./SamplerUtils.sol";

contract PlatypusSampler is
    SamplerUtils,
    ApproximateBuys
{

    function sampleSellsFromPlatypus(
        address router,
        address[] memory path,
        address[] memory pool,
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
                IPlatypus(router).quotePotentialSwaps(path, pool, takerTokenAmounts[i])
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

    function sampleBuysFromPlatypus(
        address router,
        address[] memory path,
        address[] memory pool,
        uint256[] memory makerTokenAmounts
    )
        public
        view
        returns (uint256[] memory takerTokenAmounts)
    {
        address[] memory invertBuyPath;
        address[] memory invertPoolPath;

        if(path.length > 2){

            invertBuyPath = new address[](3);
            invertPoolPath = new address[](2);

            invertBuyPath[0] = path[2];
            invertBuyPath[2] = path[0];
            invertBuyPath[1] = path[1];

            invertPoolPath[0] = pool[1];
            invertPoolPath[1] = pool[0];
        }
        else {

            invertBuyPath = new address[](2);
            invertPoolPath = new address[](1);

            invertBuyPath[0] = path[1];
            invertBuyPath[1] = path[0];
            invertPoolPath[0] = pool[0];
        }

        uint256[] memory result = _sampleApproximateBuys(
                ApproximateBuyQuoteOpts({
                    makerTokenData: abi.encode(router, invertBuyPath, invertPoolPath),
                    takerTokenData: abi.encode(router, path, pool),
                    getSellQuoteCallback: _sampleSellForApproximateBuyFromPlatypus
                }),
                makerTokenAmounts
        );

        return result;
    }


    function _sampleSellForApproximateBuyFromPlatypus(
        bytes memory makerTokenData,
        bytes memory takerTokenData,
        uint256 sellAmount
    )
        private
        view
        returns (uint256 buyAmount)
    {
        (address router,  address[] memory _path, address[] memory _pool ) = abi.decode(makerTokenData, (address, address[], address[]));

        (bool success, bytes memory resultData) = address(this).staticcall(abi.encodeWithSelector(
            this.sampleSellsFromPlatypus.selector,
            router,
            _path,
            _pool,
            _toSingleValueArray(sellAmount)
        ));

        if(!success) {
            return 0;
        }
        // solhint-disable-next-line indent
        return abi.decode(resultData, (uint256[]))[0];
    }

}

