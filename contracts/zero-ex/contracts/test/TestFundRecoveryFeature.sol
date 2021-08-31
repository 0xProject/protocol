// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6;
pragma experimental ABIEncoderV2;
import "../src/features/FundRecoveryFeature.sol";

contract TestFundRecoveryFeature is FundRecoveryFeature {
    constructor(
        // IERC20TokenV06 erc20,
        // uint256 amountOut,
        // address payable recipientWallet
    )
        FundRecoveryFeature()
        public
    {}

    receive() external payable {}
}