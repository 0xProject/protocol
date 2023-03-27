pragma solidity >=0.6.5;

import "forge-std/Test.sol";
import "../src/TraderJoeV2MultiQuoter.sol";
import "../src/TraderJoeV2Common.sol";
import "@traderjoe-xyz/joe-v2/src/LBQuoterV2.sol";

interface ILBQuoter {
    function findBestPathFromAmountIn(
        address[] calldata _route,
        uint256 _amountIn
    ) external view returns (LBQuoterV2.Quote memory quote);
}

contract TestTraderJoeV2MultiQuoter is Test, TraderJoeV2Common {
    /// @dev error threshold for comparison between MultiQuoter and TraderJoe's LBQuoterV2.
    uint256 constant ERROR_THRESHOLD_1_BPS = 0.0001e18;

    address constant JOE = 0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd;
    address constant WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;
    address constant WETHe = 0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB;

    address constant WAVAX_WETHe_POOL = 0x42Be75636374dfA0e57EB96fA7F68fE7FcdAD8a3;
    address constant JOE_WAVAX_POOL = 0xc01961EdE437Bf0cC41D064B1a3F6F0ea6aa2a40;

    address constant factory = 0x6E77932A92582f504FF6c4BdbCef7Da6c198aEEf;
    address constant router = 0xE3Ffc583dC176575eEA7FD9dF2A7c65F7E23f4C3;

    TraderJoeV2MultiQuoter multiQuoter;
    LBQuoterV2 quoter;
    uint256[][] testAmounts;

    function setUp() public {
        multiQuoter = new TraderJoeV2MultiQuoter();
        quoter = new LBQuoterV2(router, factory);

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

    function testSingleHopQuotes() public {
        address[] memory tokenPath = new address[](2);
        tokenPath[0] = WAVAX;
        tokenPath[1] = WETHe;

        address[] memory poolPath = new address[](1);
        poolPath[0] = WAVAX_WETHe_POOL;

        testAllAmountsAndPathsForBuysAndSells(tokenPath, poolPath);
    }

    function testMultiHopQuotes() public {
        address[] memory tokenPath = new address[](3);
        tokenPath[0] = JOE;
        tokenPath[1] = WAVAX;
        tokenPath[2] = WETHe;

        address[] memory poolPath = new address[](2);
        poolPath[0] = JOE_WAVAX_POOL;
        poolPath[1] = WAVAX_WETHe_POOL;

        testAllAmountsAndPathsForBuysAndSells(tokenPath, poolPath);
    }

    function testAllAmountsAndPathsForBuysAndSells(address[] memory tokenPath, address[] memory poolPath) private {
        uint256 traderJoeQuoterGasUsage;
        uint256 multiQuoterGasUsage;

        bytes memory path = toTraderJoeV2Path(tokenPath, poolPath);
        address[] memory reverseTokenPath = reverseAddressPath(tokenPath);
        bytes memory reversePath = toTraderJoeV2Path(reverseTokenPath, reverseAddressPath(poolPath));

        console.log("Quoter Gas Comparison: ");
        console.log("Token Path: ");
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            console.logAddress(tokenPath[i]);
        }

        for (uint256 i = 0; i < testAmounts.length; ++i) {
            (traderJoeQuoterGasUsage, multiQuoterGasUsage) = compareQuoterSells(path, tokenPath, testAmounts[i]);
            console.log(
                "Normal Path Sell: test=%d, traderJoeQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                traderJoeQuoterGasUsage,
                multiQuoterGasUsage
            );

            (traderJoeQuoterGasUsage, multiQuoterGasUsage) = compareQuoterSells(
                reversePath,
                reverseTokenPath,
                testAmounts[i]
            );
            console.log(
                "Reverse Path Sell: test=%d, traderJoeQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                traderJoeQuoterGasUsage,
                multiQuoterGasUsage
            );

            (traderJoeQuoterGasUsage, multiQuoterGasUsage) = compareQuoterBuys(reversePath, tokenPath, testAmounts[i]);
            console.log(
                "Normal Path Buy: test=%d, traderJoeQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                traderJoeQuoterGasUsage,
                multiQuoterGasUsage
            );

            (traderJoeQuoterGasUsage, multiQuoterGasUsage) = compareQuoterBuys(path, reverseTokenPath, testAmounts[i]);
            console.log(
                "Reverse Path Buy: test=%d, traderJoeQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                traderJoeQuoterGasUsage,
                multiQuoterGasUsage
            );
        }
    }

    function compareQuoterSells(
        bytes memory path,
        address[] memory tokenPath,
        uint256[] memory amountsIn
    ) private returns (uint256 traderJoeQuoterGasUsage, uint256 multiQuoterGasUsage) {
        uint256 gas0 = gasleft();
        uint256[] memory multiQuoterAmountsOut;
        try multiQuoter.quoteExactMultiInput(factory, path, amountsIn) {} catch (bytes memory reason) {
            bool success;
            (success, multiQuoterAmountsOut, ) = decodeMultiSwapRevert(reason);
            assertTrue(success);
        }
        uint256 gas1 = gasleft();

        for (uint256 i = 0; i < amountsIn.length; ++i) {
            try quoter.findBestPathFromAmountIn(tokenPath, amountsIn[i]) returns (LBQuoterV2.Quote memory quote) {
                assertApproxEqRel(
                    multiQuoterAmountsOut[i],
                    quote.amounts[quote.amounts.length - 1],
                    ERROR_THRESHOLD_1_BPS
                );
            } catch {
                assertEq(
                    multiQuoterAmountsOut[i],
                    0,
                    "compareQuoterSells: MultiQuoter amount should be 0 when TraderJoeV2 QuoterV2 reverts"
                );
            }
        }
        return (gas1 - gasleft(), gas0 - gas1);
    }

    function compareQuoterBuys(
        bytes memory path,
        address[] memory tokenPath,
        uint256[] memory amountsOut
    ) private returns (uint256 traderJoeQuoterGasUsage, uint256 multiQuoterGasUsage) {
        uint256 gas0 = gasleft();
        uint256[] memory multiQuoterAmountsIn;
        try multiQuoter.quoteExactMultiOutput(factory, path, amountsOut) {} catch (bytes memory reason) {
            bool success;
            (success, multiQuoterAmountsIn, ) = decodeMultiSwapRevert(reason);
            assertTrue(success);
        }
        uint256 gas1 = gasleft();

        for (uint256 i = 0; i < amountsOut.length; ++i) {
            try quoter.findBestPathFromAmountOut(tokenPath, amountsOut[i]) returns (LBQuoterV2.Quote memory quote) {
                assertApproxEqRel(multiQuoterAmountsIn[i], quote.amounts[0], ERROR_THRESHOLD_1_BPS);
            } catch {
                assertEq(
                    multiQuoterAmountsIn[i],
                    0,
                    "compareQuoterSells: MultiQuoter amount should be 0 when TraderJoeV2 QuoterV2 reverts"
                );
            }
        }
        return (gas1 - gasleft(), gas0 - gas1);
    }
}
