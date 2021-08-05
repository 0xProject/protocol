// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6;
pragma experimental ABIEncoderV2;
import "../src/features/UniswapV3Feature.sol";

contract TestUniswapV3Feature is UniswapV3Feature {
    constructor(
        IEtherTokenV06 weth,
        address uniFactory,
        bytes32 poolInitCodeHash
    )
        UniswapV3Feature(weth, uniFactory, poolInitCodeHash)
        public
    {}

    receive() external payable {}
}
