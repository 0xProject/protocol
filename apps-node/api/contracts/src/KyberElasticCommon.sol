pragma solidity >=0.6;
pragma experimental ABIEncoderV2;

import "./interfaces/IKyberElastic.sol";
import "./interfaces/IMultiQuoter.sol";
import "./TickBasedAMMCommon.sol";

contract KyberElasticCommon is TickBasedAMMCommon {
    uint256 private constant POOL_FILTERING_QUOTE_GAS = 450e3;

    /// @dev Returns `poolPaths` to sample against. The caller is responsible for not using path involving zero address(es).
    function _getPoolPaths(
        IMultiQuoter quoter,
        address factory,
        address[] memory path,
        uint256 inputAmount
    ) internal view returns (address[][] memory poolPaths) {
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
        address factory,
        address[] memory path,
        uint256 inputAmount
    ) internal view returns (address[][] memory poolPaths) {
        poolPaths = new address[][](2);
        (address[2] memory topPools, ) = _getTopTwoPools(quoter, factory, path[0], path[1], inputAmount);

        uint256 pathCount = 0;
        for (uint256 i = 0; i < 2; i++) {
            address topPool = topPools[i];
            poolPaths[pathCount] = new address[](1);
            poolPaths[pathCount][0] = topPool;
            pathCount++;
        }
    }

    function _getPoolPathTwoHop(
        IMultiQuoter quoter,
        address factory,
        address[] memory path,
        uint256 inputAmount
    ) internal view returns (address[][] memory poolPaths) {
        poolPaths = new address[][](4);
        (address[2] memory firstHopTopPools, uint256[2] memory firstHopAmounts) = _getTopTwoPools(
            quoter,
            factory,
            path[0],
            path[1],
            inputAmount
        );
        (address[2] memory secondHopTopPools, ) = _getTopTwoPools(
            quoter,
            factory,
            path[1],
            path[2],
            firstHopAmounts[0]
        );

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
        IMultiQuoter multiQuoter,
        address factory,
        address inputToken,
        address outputToken,
        uint256 inputAmount
    ) internal view returns (address[2] memory topPools, uint256[2] memory topOutputAmounts) {
        address[] memory tokenPath = new address[](2);
        tokenPath[0] = inputToken;
        tokenPath[1] = outputToken;

        uint256[] memory inputAmounts = new uint256[](1);
        inputAmounts[0] = inputAmount;

        uint16[5] memory validPoolFees = [uint16(8), uint16(10), uint16(40), uint16(300), uint16(1000)]; // in bps
        for (uint256 i = 0; i < validPoolFees.length; ++i) {
            address pool = IKyberElasticFactory(factory).getPool(inputToken, outputToken, validPoolFees[i]);
            if (!_isValidPool(pool)) {
                continue;
            }

            address[] memory poolPath = new address[](1);
            poolPath[0] = pool;
            bytes memory dexPath = _toPath(tokenPath, poolPath);

            try
                multiQuoter.quoteExactMultiInput{gas: POOL_FILTERING_QUOTE_GAS}(factory, dexPath, inputAmounts)
            {} catch (bytes memory reason) {
                (bool success, uint256[] memory outputAmounts, ) = decodeMultiSwapRevert(reason);
                if (success) {
                    // Keeping track of the top 2 pools.
                    if (outputAmounts[0] > topOutputAmounts[0]) {
                        topOutputAmounts[1] = topOutputAmounts[0];
                        topPools[1] = topPools[0];
                        topOutputAmounts[0] = outputAmounts[0];
                        topPools[0] = pool;
                    } else if (outputAmounts[0] > topOutputAmounts[1]) {
                        topOutputAmounts[1] = outputAmounts[0];
                        topPools[1] = pool;
                    }
                }
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
