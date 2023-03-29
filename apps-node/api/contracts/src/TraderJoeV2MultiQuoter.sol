// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2022 ZeroEx Intl.

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

pragma solidity 0.8.10;

import "@traderjoe-xyz/joe-v2/src/libraries/FeeHelper.sol";
import "@traderjoe-xyz/joe-v2/src/libraries/SwapHelper.sol";
import "@traderjoe-xyz/joe-v2/src/libraries/Math512Bits.sol";
import "@traderjoe-xyz/joe-v2/src/libraries/Constants.sol";
import "@traderjoe-xyz/joe-v2/src/libraries/SafeCast.sol";
import "@traderjoe-xyz/joe-v2/src/interfaces/ILBPairFactory.sol";
import "@traderjoe-xyz/joe-v2/src/interfaces/ILBToken.sol";
import "@traderjoe-xyz/joe-v2/src/LBErrors.sol";

import "./libraries/TraderJoeV2Path.sol";
import "./MultiQuoter.sol";

contract TraderJoeV2MultiQuoter is MultiQuoter {
    using TraderJoeV2Path for bytes;
    using FeeHelper for FeeHelper.FeeParameters;
    using SwapHelper for ILBPair.Bin;
    using Math512Bits for uint256;
    using SafeCast for uint256;

    // the top level state of the multiswap, the results are transient from one swap calculation to the next
    struct SwapState {
        // the amount remaining to be swapped in/out of the input/output asset
        uint256 amountSpecifiedRemaining;
        // the amount already swapped out/in of the output/input asset
        uint256 amountCalculated;
        // the current quote amount we are querying liquidity for
        uint256 amountsIndex;
        // the gas we had left before we started the swap process
        ILBPair.Bin bin;
        // the current active id of the bin being queried
        uint256 activeId;
        // the top level fee parameters used for the swap
        FeeHelper.FeeParameters fp;
        // the total amount of tokenX in the pair reserves (only used for exact output swaps as a safety check)
        uint256 pairReserveX;
        // the total amount of tokenY in the pair reserves (only used for exact output swaps as a safety check)
        uint256 pairReserveY;
        // the current aggregate gas estimate for multiswap, only updated upon tick crossing
        uint256 gasAggregate;
    }

    // the top level parameters used for the multiswap logic
    struct SwapParams {
        // whether the current swap is an exactInput swap
        bool exactInput;
        // whether this swap is from token0 --> token1
        bool zeroForOne;
        // the pool we are swapping on
        address pool;
    }

    /// @inheritdoc MultiQuoter
    function getFirstSwapDetails(
        address factory,
        bytes memory path,
        bool isExactInput
    ) internal view override returns (address pool, bool zeroForOne) {
        address tokenIn;
        address tokenOut;
        uint16 binStep;

        if (isExactInput) {
            (tokenIn, tokenOut, binStep) = path.decodeFirstPool();
        } else {
            (tokenOut, tokenIn, binStep) = path.decodeFirstPool();
        }

        pool = address(ILBFactory(factory).getLBPairInformation(IERC20(tokenIn), IERC20(tokenOut), binStep).LBPair);
        zeroForOne = address(ILBPair(pool).tokenY()) == tokenOut;
    }

    /// @notice Returns the amounts in/out and fees of the bin based on the bin reserves
    /// @param state the current state of the underlying pool
    /// @param params helper params describing the multiswap conditions
    /// @return amountInToBin the amount of tokenX/tokenY going into the current bin
    /// @return amountOutOfBin the amount of tokenX/tokenY going out of the current bin
    /// @return fees the total fees paid in input token resulting from this swap
    function getAmountsAndUpdateBin(
        SwapState memory state,
        SwapParams memory params
    ) private view returns (uint256 amountInToBin, uint256 amountOutOfBin, FeeHelper.FeesDistribution memory fees) {
        uint256 price = BinHelper.getPriceFromId(state.activeId, state.fp.binStep);

        uint256 reserve;
        uint256 maxAmountInToBin;
        if (params.zeroForOne) {
            reserve = state.bin.reserveY;
            maxAmountInToBin = reserve.shiftDivRoundUp(Constants.SCALE_OFFSET, price);
        } else {
            reserve = state.bin.reserveX;
            maxAmountInToBin = price.mulShiftRoundUp(reserve, Constants.SCALE_OFFSET);
        }

        state.fp.updateVolatilityAccumulated(state.activeId);
        fees = state.fp.getFeeAmountDistribution(state.fp.getFeeAmount(maxAmountInToBin));

        if (params.exactInput && maxAmountInToBin + fees.total <= state.amountSpecifiedRemaining) {
            amountInToBin = maxAmountInToBin;
            amountOutOfBin = reserve;
        } else if (!params.exactInput && reserve <= state.amountSpecifiedRemaining) {
            amountInToBin = maxAmountInToBin;
            amountOutOfBin = reserve;
        } else if (params.exactInput) {
            fees = state.fp.getFeeAmountDistribution(state.fp.getFeeAmountFrom(state.amountSpecifiedRemaining));
            amountInToBin = state.amountSpecifiedRemaining - fees.total;
            amountOutOfBin = params.zeroForOne
                ? price.mulShiftRoundDown(amountInToBin, Constants.SCALE_OFFSET)
                : amountInToBin.shiftDivRoundDown(Constants.SCALE_OFFSET, price);
            // Safety check in case rounding returns a higher value than expected
            if (amountOutOfBin > reserve) amountOutOfBin = reserve;
        } else {
            amountOutOfBin = state.amountSpecifiedRemaining;
            amountInToBin = params.zeroForOne
                ? amountOutOfBin.shiftDivRoundUp(Constants.SCALE_OFFSET, price)
                : price.mulShiftRoundUp(amountOutOfBin, Constants.SCALE_OFFSET);
            fees = state.fp.getFeeAmountDistribution(state.fp.getFeeAmount(amountInToBin));
        }

        updateBinReserves(state, params, amountInToBin, amountOutOfBin, fees);
    }

    /// @notice updates the in memory bin reserves to reflect the completion of a swap
    /// @param state the current state of the underlying pool
    /// @param params helper params describing the multiswap conditions
    /// @param amountInToBin the amount of tokenX/tokenY going into the current bin
    /// @param amountOutOfBin the amount of tokenX/tokenY going out of the current bin
    /// @param fees the total fees paid in input token resulting from this swap
    function updateBinReserves(
        SwapState memory state,
        SwapParams memory params,
        uint256 amountInToBin,
        uint256 amountOutOfBin,
        FeeHelper.FeesDistribution memory fees
    ) private view {
        FeeHelper.FeesDistribution memory feesX;
        FeeHelper.FeesDistribution memory feesY;

        (feesX.total, feesY.total, feesX.protocol, feesY.protocol) = ILBPair(params.pool).getGlobalFees();

        state.bin.updateFees(
            params.zeroForOne ? feesX : feesY,
            fees,
            params.zeroForOne,
            ILBToken(params.pool).totalSupply(state.activeId)
        );

        if (params.zeroForOne) {
            state.bin.reserveX += amountInToBin.safe112();

            unchecked {
                state.bin.reserveY -= amountOutOfBin.safe112();
            }
        } else {
            state.bin.reserveY += amountInToBin.safe112();
            unchecked {
                state.bin.reserveX -= amountOutOfBin.safe112();
            }
        }
    }

    /// @notice a helper function to absolute value an int256 to uint256
    function abs(int256 x) private pure returns (uint256) {
        return x > 0 ? uint256(x) : uint256(-x);
    }

    /// @inheritdoc MultiQuoter
    function multiswap(
        address p,
        bool zeroForOne,
        int256[] memory amounts
    ) internal view override returns (MultiSwapResult memory result) {
        result.gasEstimates = new uint256[](amounts.length);
        result.amounts0 = new int256[](amounts.length);
        result.amounts1 = new int256[](amounts.length);

        ILBPair pair = ILBPair(p);

        SwapParams memory params = SwapParams({exactInput: amounts[0] > 0, zeroForOne: zeroForOne, pool: p});

        SwapState memory state = SwapState({
            amountSpecifiedRemaining: abs(amounts[0]),
            amountCalculated: 0,
            amountsIndex: 0,
            bin: ILBPair.Bin(0, 0, 0, 0),
            activeId: 0,
            fp: FeeHelper.FeeParameters(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
            pairReserveX: 0,
            pairReserveY: 0,
            gasAggregate: 0
        });

        // get the active ID and initialize the fee parameters
        (state.pairReserveX, state.pairReserveY, state.activeId) = pair.getReservesAndId();
        state.fp = pair.feeParameters();
        state.fp.updateVariableFeeParameters(state.activeId);

        // initialize the bin based on current active ID
        (uint256 reserveX, uint256 reserveY) = pair.getBin(uint24(state.activeId));
        state.bin = ILBPair.Bin(uint112(reserveX), uint112(reserveY), 0, 0);

        // Performs the actual swap, bin per bin
        // It uses the findFirstNonEmptyBinId function to make sure the bin we're currently looking at
        // has liquidity in it.
        uint256 amountInToBin;
        uint256 amountOutOfBin;
        FeeHelper.FeesDistribution memory fees;
        uint256 gasBefore;
        while (true) {
            gasBefore = gasleft();
            // exit early if there isn't enough liquidity to satisfy an exact output swap
            if (
                !params.exactInput &&
                (
                    params.zeroForOne
                        ? state.amountSpecifiedRemaining > state.pairReserveY
                        : state.amountSpecifiedRemaining > state.pairReserveX
                )
            ) {
                return result;
            }

            if ((!zeroForOne && state.bin.reserveX != 0) || (zeroForOne && state.bin.reserveY != 0)) {
                (amountInToBin, amountOutOfBin, fees) = getAmountsAndUpdateBin(state, params);
                if (params.exactInput) {
                    state.amountSpecifiedRemaining -= amountInToBin + fees.total;
                    state.amountCalculated += amountOutOfBin;
                } else {
                    state.amountSpecifiedRemaining -= amountOutOfBin;
                    state.amountCalculated += amountInToBin + fees.total;

                    // update pair reserves for exact output swaps
                    if (params.zeroForOne) {
                        state.pairReserveY -= amountOutOfBin;
                    } else {
                        state.pairReserveX -= amountOutOfBin;
                    }
                }
            }

            if (state.amountSpecifiedRemaining != 0) {
                state.gasAggregate += gasBefore - gasleft();
                try pair.findFirstNonEmptyBinId(uint24(state.activeId), params.zeroForOne) returns (uint24 id) {
                    state.activeId = id;
                } catch {
                    // we have hit the max/min bin so return what we have so far
                    return result;
                }
                (reserveX, reserveY) = pair.getBin(uint24(state.activeId));
                state.bin = ILBPair.Bin(uint112(reserveX), uint112(reserveY), 0, 0);
            } else {
                (result.amounts0[state.amountsIndex], result.amounts1[state.amountsIndex]) = params.zeroForOne ==
                    params.exactInput
                    ? (amounts[state.amountsIndex], int256(state.amountCalculated))
                    : (int256(state.amountCalculated), amounts[state.amountsIndex]);
                // adjust amount signage to adhere to MultiQuoter assumptions
                if (params.exactInput && params.zeroForOne) {
                    result.amounts1[state.amountsIndex] *= -1;
                } else if (params.exactInput && !params.zeroForOne) {
                    result.amounts0[state.amountsIndex] *= -1;
                }

                result.gasEstimates[state.amountsIndex] = state.gasAggregate + (gasBefore - gasleft());

                if (state.amountsIndex == amounts.length - 1) {
                    return result;
                }

                state.amountsIndex += 1;
                state.amountSpecifiedRemaining = abs(amounts[state.amountsIndex] - amounts[state.amountsIndex - 1]);
            }
        }
    }

    /// @inheritdoc MultiQuoter
    function pathHasMultiplePools(bytes memory path) internal pure override returns (bool) {
        return path.hasMultiplePools();
    }

    /// @inheritdoc MultiQuoter
    function pathSkipToken(bytes memory path) internal pure override returns (bytes memory) {
        return path.skipToken();
    }
}
