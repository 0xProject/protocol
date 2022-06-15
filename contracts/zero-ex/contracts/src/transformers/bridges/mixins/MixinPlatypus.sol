pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "../IBridgeAdapter.sol";


interface IPlatypusRouter {

    function swapTokensForTokens(
        address[] calldata tokenPath,
        address[] calldata poolPath,
        uint256 fromAmount,
        uint256 minimumToAmount,
        address to,
        uint256 deadline
    ) external returns (uint256 amountOut, uint256 haircut);
}

contract MixinPlatypus {

    using LibERC20TokenV06 for IERC20TokenV06;
    using LibSafeMathV06 for uint256;

    function _tradePlatypus(
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        public
        returns (uint256 boughtAmount)
    {
        IPlatypusRouter router;
        address _router;
        address[] memory _pool;
        IERC20TokenV06[] memory path;
        address[] memory _path;

        {
            (_router, _pool, _path) = abi.decode(bridgeData, (address, address[], address[]));

            // To get around `abi.decode()` not supporting interface array types.
            assembly { path := _path }
        }

        router = IPlatypusRouter(_router);
        //corresponding platypus asset pool for the ERC20's in the path

        require(path.length >= 2, "MixinPlatypus/PATH_LENGTH_MUST_BE_AT_LEAST_TWO");
        require(
            path[path.length - 1] == buyToken,
            "MixinPlatypus/LAST_ELEMENT_OF_PATH_MUST_MATCH_OUTPUT_TOKEN"
        );
        // Grant the Platypus router an allowance to sell the first token.
        path[0].approveIfBelow(address(router), sellAmount);

        uint256 beforeBalance = buyToken.balanceOf(address(this));

        (uint256 amountOut, uint256 haircut) = router.swapTokensForTokens(
            // Convert to `buyToken` along this path.
            _path,
            //
            _pool,
             // Sell all tokens we hold.
            sellAmount,
             // Minimum buy amount.
            0,
            // Recipient is `this`.
            address(this),

            block.timestamp + 10000
        );
        boughtAmount = buyToken.balanceOf(address(this)).safeSub(beforeBalance);
        return boughtAmount;
    }
}