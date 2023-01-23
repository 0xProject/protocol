// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2020 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity ^0.8;

import "./errors/LibRichErrorsV08.sol";
import "./errors/LibSafeMathRichErrorsV08.sol";

library LibSafeMathV08 {
    function safeMul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        if (c / a != b) {
            LibRichErrorsV08.rrevert(
                LibSafeMathRichErrorsV08.Uint256BinOpError(
                    LibSafeMathRichErrorsV08.BinOpErrorCodes.MULTIPLICATION_OVERFLOW,
                    a,
                    b
                )
            );
        }
        return c;
    }

    function safeDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        if (b == 0) {
            LibRichErrorsV08.rrevert(
                LibSafeMathRichErrorsV08.Uint256BinOpError(
                    LibSafeMathRichErrorsV08.BinOpErrorCodes.DIVISION_BY_ZERO,
                    a,
                    b
                )
            );
        }
        uint256 c = a / b;
        return c;
    }

    function safeSub(uint256 a, uint256 b) internal pure returns (uint256) {
        if (b > a) {
            LibRichErrorsV08.rrevert(
                LibSafeMathRichErrorsV08.Uint256BinOpError(
                    LibSafeMathRichErrorsV08.BinOpErrorCodes.SUBTRACTION_UNDERFLOW,
                    a,
                    b
                )
            );
        }
        return a - b;
    }

    function safeAdd(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        if (c < a) {
            LibRichErrorsV08.rrevert(
                LibSafeMathRichErrorsV08.Uint256BinOpError(
                    LibSafeMathRichErrorsV08.BinOpErrorCodes.ADDITION_OVERFLOW,
                    a,
                    b
                )
            );
        }
        return c;
    }

    function max256(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }

    function min256(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function safeMul128(uint128 a, uint128 b) internal pure returns (uint128) {
        if (a == 0) {
            return 0;
        }
        uint128 c = a * b;
        if (c / a != b) {
            LibRichErrorsV08.rrevert(
                LibSafeMathRichErrorsV08.Uint256BinOpError(
                    LibSafeMathRichErrorsV08.BinOpErrorCodes.MULTIPLICATION_OVERFLOW,
                    a,
                    b
                )
            );
        }
        return c;
    }

    function safeDiv128(uint128 a, uint128 b) internal pure returns (uint128) {
        if (b == 0) {
            LibRichErrorsV08.rrevert(
                LibSafeMathRichErrorsV08.Uint256BinOpError(
                    LibSafeMathRichErrorsV08.BinOpErrorCodes.DIVISION_BY_ZERO,
                    a,
                    b
                )
            );
        }
        uint128 c = a / b;
        return c;
    }

    function safeSub128(uint128 a, uint128 b) internal pure returns (uint128) {
        if (b > a) {
            LibRichErrorsV08.rrevert(
                LibSafeMathRichErrorsV08.Uint256BinOpError(
                    LibSafeMathRichErrorsV08.BinOpErrorCodes.SUBTRACTION_UNDERFLOW,
                    a,
                    b
                )
            );
        }
        return a - b;
    }

    function safeAdd128(uint128 a, uint128 b) internal pure returns (uint128) {
        uint128 c = a + b;
        if (c < a) {
            LibRichErrorsV08.rrevert(
                LibSafeMathRichErrorsV08.Uint256BinOpError(
                    LibSafeMathRichErrorsV08.BinOpErrorCodes.ADDITION_OVERFLOW,
                    a,
                    b
                )
            );
        }
        return c;
    }

    function max128(uint128 a, uint128 b) internal pure returns (uint128) {
        return a >= b ? a : b;
    }

    function min128(uint128 a, uint128 b) internal pure returns (uint128) {
        return a < b ? a : b;
    }

    function safeDowncastToUint128(uint256 a) internal pure returns (uint128) {
        if (a > type(uint128).max) {
            LibRichErrorsV08.rrevert(
                LibSafeMathRichErrorsV08.Uint256DowncastError(
                    LibSafeMathRichErrorsV08.DowncastErrorCodes.VALUE_TOO_LARGE_TO_DOWNCAST_TO_UINT128,
                    a
                )
            );
        }
        return uint128(a);
    }
}
