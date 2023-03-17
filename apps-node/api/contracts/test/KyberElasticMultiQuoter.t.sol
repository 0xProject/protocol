pragma solidity >=0.6.0;
pragma experimental ABIEncoderV2;

import "forge-std/Test.sol";
import "../src/KyberElasticMultiQuoter.sol";
import "../src/KyberElasticCommon.sol";
import {IKyberElasticPool, IKyberElasticFactory} from "../src/interfaces/IKyberElastic.sol";

/// @title QuoterV2 Interface
/// @notice Supports quoting the calculated amounts from exact input or exact output swaps.
/// @notice For each pool also tells you the number of initialized ticks crossed and the sqrt price of the pool after the swap.
/// @dev These functions are not marked view because they rely on calling non-view functions and reverting
/// to compute the result. They are also not gas efficient and should not be called on-chain.
interface IQuoterV2 {
    /// @notice Returns the amount out received for a given exact input swap without executing the swap
    /// @param path The path of the swap, i.e. each token pair and the pool fee
    /// @param amountIn The amount of the first token to swap
    /// @return amountOut The amount of the last token that would be received
    /// @return afterSqrtPList List of the sqrt price after the swap for each pool in the path
    /// @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
    /// @return gasEstimate The estimate of the gas that the swap consumes
    function quoteExactInput(
        bytes memory path,
        uint256 amountIn
    )
        external
        returns (
            uint256 amountOut,
            uint160[] memory afterSqrtPList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );

    /// @notice Returns the amount in required for a given exact output swap without executing the swap
    /// @param path The path of the swap, i.e. each token pair and the pool fee. Path must be provided in reverse order
    /// @param amountOut The amount of the last token to receive
    /// @return amountIn The amount of first token required to be paid
    /// @return afterSqrtPList List of the sqrt price after the swap for each pool in the path
    /// @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
    /// @return gasEstimate The estimate of the gas that the swap consumes
    function quoteExactOutput(
        bytes memory path,
        uint256 amountOut
    )
        external
        returns (
            uint256 amountIn,
            uint160[] memory afterSqrtPList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );
}

contract TestKyberElasticMultiQuoter is Test, KyberElasticCommon {
    // NOTE: Example test command: forge test --fork-url $ETH_RPC_URL --fork-block-number 16400073 --etherscan-api-key $ETHERSCAN_API_KEY --match-contract "KyberElastic"
    // TODO: investigate small swap amounts ~$20 showing differences of ~$.01 (5 bps).
    uint256 constant ERROR_THRESHOLD_10_BPS = .001e18;

    address constant KNC = 0xdeFA4e8a7bcBA345F687a2f1456F5Edd9CE97202;
    address constant ETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant LINK = 0x514910771AF9Ca656af840dff83E8264EcF986CA;

    address constant ETH_KNC_POOL_100_BIP = 0xB5e643250FF59311071C5008f722488543DD7b3C;
    address constant ETH_KNC_POOL_30_BIP = 0xa38a0165e82B7a5E8650109E9e54087a34C93020;
    address constant LINK_ETH_POOL_30_BIP = 0x8990b58Ab653C9954415f4544e8deB72c2b12ED8;
    IQuoterV2 constant kyberQuoter = IQuoterV2(0x0D125c15D54cA1F8a813C74A81aEe34ebB508C1f);
    IKyberElasticFactory constant factory = IKyberElasticFactory(0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a);
    KyberElasticMultiQuoter multiQuoter;
    uint256[][] testAmounts;

    function setUp() public {
        multiQuoter = new KyberElasticMultiQuoter();

        testAmounts = new uint256[][](9);

        testAmounts[0] = new uint256[](1);
        testAmounts[0][0] = 1 ether;

        testAmounts[1] = new uint256[](1);
        testAmounts[1][0] = 1000 ether;

        testAmounts[2] = new uint256[](1);
        testAmounts[2][0] = 100000 ether;

        testAmounts[3] = new uint256[](13);
        testAmounts[4] = new uint256[](13);
        testAmounts[5] = new uint256[](13);
        for (uint256 i = 0; i < 13; ++i) {
            testAmounts[3][i] = (i + 1) * 1000 ether;
            testAmounts[4][i] = (i + 1) * 50000 ether;
            testAmounts[5][i] = (i + 1) * 100000 ether;
        }

        testAmounts[6] = new uint256[](50);
        testAmounts[7] = new uint256[](50);
        testAmounts[8] = new uint256[](50);
        for (uint256 i = 0; i < 50; ++i) {
            testAmounts[6][i] = (i + 1) * 1000 ether;
            testAmounts[7][i] = (i + 1) * 10000 ether;
            testAmounts[8][i] = (i + 1) * 50000 ether;
        }
    }

    function testLiquidPool() public {
        address[] memory tokenPath = new address[](2);
        tokenPath[0] = ETH;
        tokenPath[1] = KNC;

        address[] memory poolPath = new address[](1);
        poolPath[0] = ETH_KNC_POOL_100_BIP;

        testAllAmountsAndPaths(tokenPath, poolPath);
    }

    function testIlliquidPool() public {
        address[] memory tokenPath = new address[](2);
        tokenPath[0] = ETH;
        tokenPath[1] = KNC;

        address[] memory poolPath = new address[](1);
        poolPath[0] = ETH_KNC_POOL_30_BIP;

        testAllAmountsAndPaths(tokenPath, poolPath);
    }

    function testMultiHop() public {
        address[] memory tokenPath = new address[](3);
        tokenPath[0] = ETH;
        tokenPath[1] = KNC;
        tokenPath[2] = LINK;

        address[] memory poolPath = new address[](2);
        poolPath[0] = ETH_KNC_POOL_100_BIP;
        poolPath[1] = LINK_ETH_POOL_30_BIP;

        testAllAmountsAndPaths(tokenPath, poolPath);
    }

    function testPool() public {
        assert(IKyberElasticPool(ETH_KNC_POOL_100_BIP).token0() == ETH);
        assert(IKyberElasticPool(ETH_KNC_POOL_100_BIP).token1() == KNC);

        address testPool = factory.getPool(ETH, KNC, uint16(1000));
        assert(testPool == address(ETH_KNC_POOL_100_BIP));

        address[] memory tokenPath = new address[](2);
        tokenPath[0] = ETH;
        tokenPath[1] = KNC;

        address[][] memory poolPaths = _getPoolPaths(multiQuoter, address(factory), tokenPath, 1 ether);
        assert(poolPaths.length == 2);
        for (uint256 i; i < poolPaths.length; ++i) {
            for (uint256 j; j < poolPaths[i].length; ++j) {
                address token0 = IKyberElasticPool(poolPaths[i][j]).token0();
                assert(token0 == ETH);
                address token1 = IKyberElasticPool(poolPaths[i][j]).token1();
                assert(token1 == KNC);
            }
        }
    }

    function testAllAmountsAndPaths(address[] memory tokenPath, address[] memory poolPath) private {
        uint256 kyberQuoterGasUsage;
        uint256 multiQuoterGasUsage;

        bytes memory path = _toPath(tokenPath, poolPath);
        bytes memory reversePath = _toPath(reverseAddressPath(tokenPath), reverseAddressPath(poolPath));

        console.log("Quoter Gas Comparison");
        console.log("Token Path:");
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            console.logAddress(address(tokenPath[i]));
        }

        for (uint256 i = 0; i < testAmounts.length; ++i) {
            (kyberQuoterGasUsage, multiQuoterGasUsage) = compareQuoterSells(path, testAmounts[i]);
            console.log(
                "Normal Path Sell: test=%d, kyberQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                kyberQuoterGasUsage,
                multiQuoterGasUsage
            );
            (kyberQuoterGasUsage, multiQuoterGasUsage) = compareQuoterSells(reversePath, testAmounts[i]);
            console.log(
                "Reverse Path Sell: test=%d, kyberQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                kyberQuoterGasUsage,
                multiQuoterGasUsage
            );
            (kyberQuoterGasUsage, multiQuoterGasUsage) = compareQuoterBuys(path, testAmounts[i]);
            console.log(
                "Normal Path Buy: test=%d, kyberQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                kyberQuoterGasUsage,
                multiQuoterGasUsage
            );
            (kyberQuoterGasUsage, multiQuoterGasUsage) = compareQuoterBuys(reversePath, testAmounts[i]);
            console.log(
                "Reverse Path Buy: test=%d, kyberQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                kyberQuoterGasUsage,
                multiQuoterGasUsage
            );
        }
    }

    function compareQuoterSells(
        bytes memory path,
        uint256[] memory amountsIn
    ) private returns (uint256 kyberQuoterGasUsage, uint256 multiQuoterGasUsage) {
        uint256 gas0 = gasleft();
        uint256[] memory multiQuoterAmountsOut;
        try multiQuoter.quoteExactMultiInput(address(factory), path, amountsIn) {} catch (bytes memory reason) {
            (, multiQuoterAmountsOut, ) = decodeMultiSwapRevert(reason);
        }
        uint256 gas1 = gasleft();

        for (uint256 i = 0; i < amountsIn.length; ++i) {
            try kyberQuoter.quoteExactInput(path, amountsIn[i]) returns (
                uint256 kyberQuoterAmountOut,
                uint160[] memory /* sqrtPriceX96AfterList */,
                uint32[] memory /* initializedTicksCrossedList */,
                uint256 /* gasEstimate */
            ) {
                assertApproxEqRel(multiQuoterAmountsOut[i], kyberQuoterAmountOut, ERROR_THRESHOLD_10_BPS);
            } catch {}
        }
        return (gas1 - gasleft(), gas0 - gas1);
    }

    function compareQuoterBuys(
        bytes memory path,
        uint256[] memory amountsOut
    ) private returns (uint256 kyberQuoterGasUsage, uint256 multiQuoterGasUsage) {
        uint256 gas0 = gasleft();
        uint256[] memory multiQuoterAmountsIn;
        try multiQuoter.quoteExactMultiOutput(address(factory), path, amountsOut) {} catch (bytes memory reason) {
            (, multiQuoterAmountsIn, ) = decodeMultiSwapRevert(reason);
        }
        uint256 gas1 = gasleft();

        for (uint256 i = 0; i < amountsOut.length; ++i) {
            try kyberQuoter.quoteExactOutput(path, amountsOut[i]) returns (
                uint256 kyberQuoterAmountIn,
                uint160[] memory /* sqrtPriceX96AfterList */,
                uint32[] memory /* initializedTicksCrossedList */,
                uint256 /* gasEstimate */
            ) {
                assertApproxEqRel(multiQuoterAmountsIn[i], kyberQuoterAmountIn, ERROR_THRESHOLD_10_BPS);
            } catch {}
        }
        return (gas1 - gasleft(), gas0 - gas1);
    }
}
