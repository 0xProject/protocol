pragma solidity >=0.6;
pragma experimental ABIEncoderV2;

import "./interfaces/IKyberElastic.sol";
import "./TickBasedAMMCommon.sol";

contract KyberElasticCommon is TickBasedAMMCommon {
    /// @dev Returns `poolPaths` to sample against. The caller is responsible for not using path involving zero address(es).
    function _getPoolPaths(
        address factory,
        address[] memory path,
        uint256 amount
    ) internal view returns (address[][] memory poolPaths) {
        if (path.length == 2) {
            return _getPoolPathSingleHop(factory, path, amount);
        }
        if (path.length == 3) {
            return _getPoolPathTwoHop(factory, path, amount);
        }
        revert("KyberElastic sampler: unsupported token path length");
    }

    function _getPoolPathSingleHop(
        address factory,
        address[] memory path,
        uint256 amount
    ) internal view returns (address[][] memory poolPaths) {
        poolPaths = new address[][](2);
        address[2] memory topPools = _getTopTwoPools(factory, path[0], path[1], amount);

        uint256 pathCount = 0;
        for (uint256 i = 0; i < 2; i++) {
            address topPool = topPools[i];
            poolPaths[pathCount] = new address[](1);
            poolPaths[pathCount][0] = topPool;
            pathCount++;
        }
    }

    function _getPoolPathTwoHop(
        address factory,
        address[] memory path,
        uint256 amount
    ) internal view returns (address[][] memory poolPaths) {
        poolPaths = new address[][](4);
        address[2] memory firstHopTopPools = _getTopTwoPools(factory, path[0], path[1], amount);
        address[2] memory secondHopTopPools = _getTopTwoPools(factory, path[1], path[2], amount);

        uint256 pathCount = 0;
        for (uint256 i = 0; i < 2; i++) {
            for (uint256 j = 0; j < 2; j++) {
                poolPaths[pathCount] = new address[](2);
                address[] memory currentPath = poolPaths[pathCount];
                currentPath[0] = firstHopTopPools[i];
                currentPath[1] = secondHopTopPools[j];
                pathCount++;
            }
        }
    }

    /// @dev Returns top 0-2 pools and corresponding output amounts based on swaping `inputAmount`.
    /// Addresses in `topPools` can be zero addresses when there are pool isn't available.
    function _getTopTwoPools(
        address factory,
        address inputToken,
        address outputToken,
        uint256 amount
    ) internal view returns (address[2] memory topPools) {
        address[] memory tokenPath = new address[](2);
        tokenPath[0] = inputToken;
        tokenPath[1] = outputToken;

        uint16[5] memory validPoolFees = [uint16(8), uint16(10), uint16(40), uint16(300), uint16(1000)]; //.8 bps, .1 bps, .4 bps, 30 bps, 100 bps
        uint128[2] memory topLiquidityAmounts;
        for (uint256 i = 0; i < validPoolFees.length; ++i) {
            address pool = IKyberElasticFactory(factory).getPool(inputToken, outputToken, validPoolFees[i]);

            if (!_isValidPool(pool)) {
                continue;
            }

            // Make sure there is reasonable amount of input token inside the pool.
            // This is a tradeoff between lowering latency/gas usage
            // vs allowing pools to be sampled for liquidity.
            IERC20 token;
            token = inputToken < outputToken
                ? IERC20(IKyberElasticPool(pool).token0())
                : IERC20(IKyberElasticPool(pool).token1());
            // This threshold was determined by running simbot and seeing where
            // pricing starts to degrade vs not filtering.
            if (token.balanceOf(pool) < amount / 2) {
                continue;
            }
            (uint128 baseLiquidity, uint128 reinvestLiquidity, ) = IKyberElasticPool(pool).getLiquidityState();
            uint128 currLiquidity = baseLiquidity + reinvestLiquidity;
            if (currLiquidity > topLiquidityAmounts[0]) {
                topLiquidityAmounts[1] = topLiquidityAmounts[0];
                topPools[1] = topPools[0];
                topLiquidityAmounts[0] = currLiquidity;
                topPools[0] = pool;
            } else if (currLiquidity > topLiquidityAmounts[1]) {
                topLiquidityAmounts[1] = currLiquidity;
                topPools[1] = pool;
            }
        }
    }

    function _isValidPool(address pool) internal view returns (bool isValid) {
        // Check if it has been deployed.
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(pool)
        }
        return codeSize != 0;
    }

    function _isValidPoolPath(address[] memory poolPaths) internal pure returns (bool) {
        for (uint256 i = 0; i < poolPaths.length; i++) {
            if (poolPaths[i] == address(0)) {
                return false;
            }
        }
        return true;
    }

    function _toPath(address[] memory tokenPath, address[] memory poolPath) internal view returns (bytes memory path) {
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
                uint24 poolFee = IKyberElasticPool(poolPath[i - 1]).swapFeeUnits();
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
}
