// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ERC20} from "solmate/tokens/ERC20.sol";

library SafeERC20Lib {
    /// @notice Get decimals of the passed ERC20 token.
    /// @param  token an ERC20 token.
    /// @param  defaultDecimals the decimals value to use when `decimals()` is unimplemented by the token.
    /// @return decimal retrieved decimals or the passed default decimals.
    function safeDecimals(ERC20 token, uint8 defaultDecimals) internal view returns (uint8) {
        try token.decimals() returns (uint8 decimals) {
            return decimals;
        } catch {
            return defaultDecimals;
        }
    }
}
