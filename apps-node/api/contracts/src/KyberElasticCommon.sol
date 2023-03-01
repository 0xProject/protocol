pragma solidity >=0.6;
pragma experimental ABIEncoderV2;

import "./interfaces/IKyberElastic.sol";
import "./interfaces/IMultiQuoter.sol";

contract KyberElasticCommon {
    uint256 private constant POOL_FILTERING_QUOTE_GAS = 450e3;

    /// @dev Returns `poolPaths` to sample against. The caller is responsible for not using path involving zero address(es).
    function _getPoolPaths(
        IMultiQuoter quoter,
        IFactory factory,
        address[] memory path,
        uint256 inputAmount
    ) internal view returns (IPool[][] memory poolPaths) {
        if (path.length == 2) {
            return _getPoolPathSingleHop(quoter, factory, path, inputAmount);
        }
        if (path.length == 3) {
            return _getPoolPathTwoHop(quoter, factory, path, inputAmount);
        }
        revert("KyberElastic sampler: unsupported token path length");
    }

    function _getPoolPathSingleHop(
        IMultiQuoter quoter,
        IFactory factory,
        address[] memory path,
        uint256 inputAmount
    ) internal view returns (IPool[][] memory poolPaths) {
        poolPaths = new IPool[][](2);
        (IPool[2] memory topPools, ) = _getTopTwoPools(quoter, factory, path[0], path[1], inputAmount);

        uint256 pathCount = 0;
        for (uint256 i = 0; i < 2; i++) {
            IPool topPool = topPools[i];
            poolPaths[pathCount] = new IPool[](1);
            poolPaths[pathCount][0] = topPool;
            pathCount++;
        }
    }

    function _getPoolPathTwoHop(
        IMultiQuoter quoter,
        IFactory factory,
        address[] memory path,
        uint256 inputAmount
    ) internal view returns (IPool[][] memory poolPaths) {
        poolPaths = new IPool[][](4);
        (IPool[2] memory firstHopTopPools, uint256[2] memory firstHopAmounts) = _getTopTwoPools(
            quoter,
            factory,
            path[0],
            path[1],
            inputAmount
        );
        (IPool[2] memory secondHopTopPools, ) = _getTopTwoPools(quoter, factory, path[1], path[2], firstHopAmounts[0]);

        uint256 pathCount = 0;
        for (uint256 i = 0; i < 2; i++) {
            for (uint256 j = 0; j < 2; j++) {
                poolPaths[pathCount] = new IPool[](2);
                IPool[] memory currentPath = poolPaths[pathCount];
                currentPath[0] = firstHopTopPools[i];
                currentPath[1] = secondHopTopPools[j];
                pathCount++;
            }
        }
    }

    /// @dev Returns top 0-2 pools and corresponding output amounts based on swaping `inputAmount`.
    /// Addresses in `topPools` can be zero addresses when there are pool isn't available.
    function _getTopTwoPools(
        IMultiQuoter multiQuoter,
        IFactory factory,
        address inputToken,
        address outputToken,
        uint256 inputAmount
    ) internal view returns (IPool[2] memory topPools, uint256[2] memory outputAmounts) {
        address[] memory tokenPath = new address[](2);
        tokenPath[0] = inputToken;
        tokenPath[1] = outputToken;

        uint256[] memory inputAmounts = new uint256[](1);
        inputAmounts[0] = inputAmount;

        uint16[5] memory validPoolFees = [uint16(8), uint16(10), uint16(40), uint16(300), uint16(1000)]; // in bps
        for (uint256 i = 0; i < validPoolFees.length; ++i) {
            IPool pool = IPool(factory.getPool(inputToken, outputToken, validPoolFees[i]));
            if (!_isValidPool(pool)) {
                continue;
            }

            IPool[] memory poolPath = new IPool[](1);
            poolPath[0] = pool;
            bytes memory dexPath = _toPath(tokenPath, poolPath);

            try
                multiQuoter.quoteExactMultiInput{gas: POOL_FILTERING_QUOTE_GAS}(factory, dexPath, inputAmounts)
            returns (uint256[] memory amountsOut, uint256[] memory /* gasEstimate */) {
                // Keeping track of the top 2 pools.
                if (amountsOut[0] > outputAmounts[0]) {
                    outputAmounts[1] = outputAmounts[0];
                    topPools[1] = topPools[0];
                    outputAmounts[0] = amountsOut[0];
                    topPools[0] = pool;
                } else if (amountsOut[0] > outputAmounts[1]) {
                    outputAmounts[1] = amountsOut[0];
                    topPools[1] = pool;
                }
            } catch {}
        }
    }

    function _isValidPool(IPool pool) internal view returns (bool isValid) {
        // Check if it has been deployed.
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(pool)
        }
        return codeSize != 0;
    }

    function _isValidPoolPath(IPool[] memory poolPaths) internal pure returns (bool) {
        for (uint256 i = 0; i < poolPaths.length; i++) {
            if (address(poolPaths[i]) == address(0)) {
                return false;
            }
        }
        return true;
    }

    function _toPath(address[] memory tokenPath, IPool[] memory poolPath) internal view returns (bytes memory path) {
        require(tokenPath.length >= 2 && tokenPath.length == poolPath.length + 1, "invalid path lengths");
        // paths are tightly packed as:
        // [token0, token0token1PairFee, token1, token1Token2PairFee, token2, ...]
        path = new bytes(tokenPath.length * 20 + poolPath.length * 3);
        uint256 o;
        assembly {
            o := add(path, 32)
        }
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            if (i > 0) {
                uint24 poolFee = poolPath[i - 1].swapFeeUnits();
                assembly {
                    mstore(o, shl(232, poolFee))
                    o := add(o, 3)
                }
            }
            address token = tokenPath[i];
            assembly {
                mstore(o, shl(96, token))
                o := add(o, 20)
            }
        }
    }

    function _reverseTokenPath(address[] memory tokenPath) internal pure returns (address[] memory reversed) {
        reversed = new address[](tokenPath.length);
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            reversed[i] = tokenPath[tokenPath.length - i - 1];
        }
    }

    function _reversePoolPath(IPool[] memory poolPath) internal pure returns (IPool[] memory reversed) {
        reversed = new IPool[](poolPath.length);
        for (uint256 i = 0; i < poolPath.length; ++i) {
            reversed[i] = poolPath[poolPath.length - i - 1];
        }
    }
}
