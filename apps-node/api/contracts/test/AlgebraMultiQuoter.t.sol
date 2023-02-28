pragma solidity >=0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";

import "forge-std/Test.sol";
import "../src/AlgebraMultiQuoter.sol";
import "../src/AlgebraCommon.sol";

contract TestAlgebraMultiQuoter is Test, AlgebraCommon {
    /// @dev error threshold in wei for comparison between MultiQuoter and UniswapV3's official QuoterV2.
    /// MultiQuoter results in some rounding errors due to SqrtPriceMath library.
    uint256 constant ERROR_THRESHOLD = 1250;

    IERC20TokenV06 constant WMATIC = IERC20TokenV06(0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270);
    IERC20TokenV06 constant WETH = IERC20TokenV06(0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619);
    IERC20TokenV06 constant DAI = IERC20TokenV06(0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063);

    IAlgebraPool constant WMATIC_WETH_POOL = IAlgebraPool(0x479e1B71A702a595e19b6d5932CD5c863ab57ee0);
    IAlgebraPool constant WMATIC_DAI_POOL = IAlgebraPool(0x6BaEad5Db7FeE6D5c9F0Ca07Bb5038C4cD279F5c);

    IAlgebraFactory constant factory = IAlgebraFactory(0x411b0fAcC3489691f28ad58c47006AF5E3Ab3A28);
    address constant poolDeployer = 0x2D98E2FA9da15aa6dC9581AB097Ced7af697CB92;

    IAlgebraQuoter constant algebraQuoter = IAlgebraQuoter(0xa15F0D7377B2A0C0c10db057f641beD21028FC89);

    AlgebraMultiQuoter multiQuoter;
    uint256[][] testAmounts;

    function setUp() public {
        multiQuoter = new AlgebraMultiQuoter();

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

    function testSingleHopQuotesForLiquidPools() public {
        IERC20TokenV06[] memory tokenPath = new IERC20TokenV06[](2);
        tokenPath[0] = WMATIC;
        tokenPath[1] = WETH;

        testAllAmountsAndPathsForBuysAndSells(tokenPath);
    }

    function testSingleHopQuotesForIlliquidPools() public {
        IERC20TokenV06[] memory tokenPath = new IERC20TokenV06[](2);
        tokenPath[0] = WMATIC;
        tokenPath[1] = DAI;

        testAllAmountsAndPathsForBuysAndSells(tokenPath);
    }

    function testMultiHopQuotes() public {
        IERC20TokenV06[] memory tokenPath = new IERC20TokenV06[](3);
        tokenPath[0] = WETH;
        tokenPath[1] = WMATIC;
        tokenPath[2] = DAI;

        testAllAmountsAndPathsForBuysAndSells(tokenPath);
    }

    function testAllAmountsAndPathsForBuysAndSells(IERC20TokenV06[] memory tokenPath) private {
        uint256 algebraQuoterGasUsage;
        uint256 multiQuoterGasUsage;

        bytes memory path = toAlgebraPath(tokenPath);
        bytes memory reversePath = toAlgebraPath(reverseTokenPath(tokenPath));

        console.log("Quoter Gas Comparison ");
        console.log("Token Path: ");
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            console.logAddress(address(tokenPath[i]));
        }

        for (uint256 i = 0; i < testAmounts.length; ++i) {
            (algebraQuoterGasUsage, multiQuoterGasUsage) = compareQuoterSells(path, testAmounts[i]);
            console.log(
                "Normal Path Sell: test=%d, algebraQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                algebraQuoterGasUsage,
                multiQuoterGasUsage
            );
            (algebraQuoterGasUsage, multiQuoterGasUsage) = compareQuoterSells(reversePath, testAmounts[i]);
            console.log(
                "Reverse Path Sell: test=%d, algebraQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                algebraQuoterGasUsage,
                multiQuoterGasUsage
            );
            (algebraQuoterGasUsage, multiQuoterGasUsage) = compareQuoterBuys(path, testAmounts[i]);
            console.log(
                "Normal Path Buy: test=%d, algebraQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                algebraQuoterGasUsage,
                multiQuoterGasUsage
            );
            (algebraQuoterGasUsage, multiQuoterGasUsage) = compareQuoterBuys(reversePath, testAmounts[i]);
            console.log(
                "Reverse Path Buy: test=%d, algebraQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                algebraQuoterGasUsage,
                multiQuoterGasUsage
            );
        }
    }

    function compareQuoterSells(
        bytes memory path,
        uint256[] memory amountsIn
    ) private returns (uint256 algebraQuoterGasUsage, uint256 multiQuoterGasUsage) {
        uint256 gas0 = gasleft();
        uint256[] memory multiQuoterAmountsOut;
        try multiQuoter.quoteExactMultiInput(factory, path, amountsIn) {} catch (bytes memory reason) {
            (, multiQuoterAmountsOut, ) = catchMultiSwapResult(reason);
        }
        uint256 gas1 = gasleft();

        for (uint256 i = 0; i < amountsIn.length; ++i) {
            try algebraQuoter.quoteExactInput(path, amountsIn[i]) returns (
                uint256 algebraQuoterAmountOut,
                uint16[] memory /* fees */
            ) {
                assertLt(
                    multiQuoterAmountsOut[i],
                    algebraQuoterAmountOut + ERROR_THRESHOLD,
                    "compareQuoterSells: MultiQuoter amount is too high compared to UniQuoter amount"
                );
                assertGt(
                    multiQuoterAmountsOut[i],
                    algebraQuoterAmountOut - ERROR_THRESHOLD,
                    "compareQuoterSells: MultiQuoter amount is too low compared to UniQuoter amount"
                );
            } catch {
                assertEq(
                    multiQuoterAmountsOut[i],
                    0,
                    "compareQuoterSells: MultiQuoter amount should be 0 when UniQuoter reverts"
                );
            }
        }
        return (gas1 - gasleft(), gas0 - gas1);
    }

    function compareQuoterBuys(
        bytes memory path,
        uint256[] memory amountsOut
    ) private returns (uint256 algebraQuoterGasUsage, uint256 multiQuoterGasUsage) {
        uint256 gas0 = gasleft();
        uint256[] memory multiQuoterAmountsIn;
        try multiQuoter.quoteExactMultiOutput(factory, path, amountsOut) {} catch (bytes memory reason) {
            (, multiQuoterAmountsIn, ) = catchMultiSwapResult(reason);
        }
        uint256 gas1 = gasleft();

        for (uint256 i = 0; i < amountsOut.length; ++i) {
            try algebraQuoter.quoteExactOutput(path, amountsOut[i]) returns (
                uint256 algebraQuoterAmountIn,
                uint16[] memory /* fees */
            ) {
                assertLt(
                    multiQuoterAmountsIn[i],
                    algebraQuoterAmountIn + ERROR_THRESHOLD,
                    "compareQuoterBuys: MultiQuoter amount is too high compared to UniQuoter amount"
                );
                assertGt(
                    multiQuoterAmountsIn[i],
                    algebraQuoterAmountIn - ERROR_THRESHOLD,
                    "compareQuoterBuys: MultiQuoter amount is too low compared to UniQuoter mamount"
                );
            } catch {
                assertEq(
                    multiQuoterAmountsIn[i],
                    0,
                    "compareQuoterBuys: MultiQuoter amount should be 0 when UniQuoter reverts"
                );
            }
        }
        return (gas1 - gasleft(), gas0 - gas1);
    }
}
