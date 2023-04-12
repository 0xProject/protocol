// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

library CubeRoot {
    /// @dev Returns the cube root of `x`.
    /// Credit to pleasemarkdarkly under MIT license
    // Originaly from https://github.com/pleasemarkdarkly/fei-protocol-core-hh/blob/main/contracts/utils/Roots.sol
    function cbrt(uint y) internal pure returns (uint z) {
        // Newton's method https://en.wikipedia.org/wiki/Cube_root#Numerical_methods
        if (y > 7) {
            z = y;
            uint x = y / 3 + 1;
            while (x < z) {
                z = x;
                x = (y / (x * x) + (2 * x)) / 3;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
