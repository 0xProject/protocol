pragma solidity >=0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";

import "forge-std/Test.sol";
import "../UniswapV3MultiQuoter.sol";
import "../UniswapV3Common.sol";

contract TestUniswapV3Sampler is Test, UniswapV3Common {
    /// @dev error threshold in wei for comparison between MultiQuoter and UniswapV3's official QuoterV2.
    /// MultiQuoter results in some rounding errors due to SqrtPriceMath library.
    uint256 constant ERROR_THRESHOLD = 50;

    IERC20TokenV06 constant DAI = IERC20TokenV06(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    IERC20TokenV06 constant FRAX = IERC20TokenV06(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    IERC20TokenV06 constant RAI = IERC20TokenV06(0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919);

    IUniswapV3Pool constant DAI_FRAX_POOL_5_BIP = IUniswapV3Pool(0x97e7d56A0408570bA1a7852De36350f7713906ec);
    IUniswapV3Pool constant RAI_FRAX_POOL_30_BIP = IUniswapV3Pool(0xd3f3bf0b928551661503Ce43BC456BBdF725986a);

    IUniswapV3QuoterV2 constant uniQuoter = IUniswapV3QuoterV2(0x61fFE014bA17989E743c5F6cB21bF9697530B21e);

    IUniswapV3Factory factory;
    UniswapV3MultiQuoter multiQuoter;
    uint256[][] testAmounts;

    function setUp() public {
        multiQuoter = new UniswapV3MultiQuoter();
        factory = uniQuoter.factory();

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

    function testSingleHopSellQuotesForLiquidPools() public {
        IERC20TokenV06[] memory tokenPath = new IERC20TokenV06[](2);
        tokenPath[0] = DAI;
        tokenPath[1] = FRAX;

        IUniswapV3Pool[] memory poolPath = new IUniswapV3Pool[](1);
        poolPath[0] = DAI_FRAX_POOL_5_BIP;

        testAllAmountsAndPathsForSells(tokenPath, poolPath);
    }

    function testSingleHopSellQuotesForIlliquidPools() public {
        IERC20TokenV06[] memory tokenPath = new IERC20TokenV06[](2);
        tokenPath[0] = RAI;
        tokenPath[1] = FRAX;

        IUniswapV3Pool[] memory poolPath = new IUniswapV3Pool[](1);
        poolPath[0] = RAI_FRAX_POOL_30_BIP;

        testAllAmountsAndPathsForSells(tokenPath, poolPath);
    }

    function testMultiHopSellQuotes() public {
        IERC20TokenV06[] memory tokenPath = new IERC20TokenV06[](3);
        tokenPath[0] = DAI;
        tokenPath[1] = FRAX;
        tokenPath[2] = RAI;

        IUniswapV3Pool[] memory poolPath = new IUniswapV3Pool[](2);
        poolPath[0] = DAI_FRAX_POOL_5_BIP;
        poolPath[1] = RAI_FRAX_POOL_30_BIP;

        testAllAmountsAndPathsForSells(tokenPath, poolPath);
    }

    function testAllAmountsAndPathsForSells(
        IERC20TokenV06[] memory tokenPath,
        IUniswapV3Pool[] memory poolPath
    ) private {
        uint256 uniQuoterGasUsage;
        uint256 multiQuoterGasUsage;

        bytes memory path = toUniswapPath(tokenPath, poolPath);
        bytes memory reversePath = toUniswapPath(reverseTokenPath(tokenPath), reversePoolPath(poolPath));

        console.log("Quoter Gas Comparison ");
        console.log("Token Path: ");
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            console.logAddress(address(tokenPath[i]));
        }

        for (uint256 i = 0; i < testAmounts.length; ++i) {
            (uniQuoterGasUsage, multiQuoterGasUsage) = compareQuoterSells(path, testAmounts[i]);
            console.log(
                "Normal Path: test=%d, uniQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                uniQuoterGasUsage,
                multiQuoterGasUsage
            );
            (uniQuoterGasUsage, multiQuoterGasUsage) = compareQuoterSells(reversePath, testAmounts[i]);
            console.log(
                "Reverse Path: test=%d, uniQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                uniQuoterGasUsage,
                multiQuoterGasUsage
            );
        }
    }

    function compareQuoterSells(
        bytes memory path,
        uint256[] memory amountsIn
    ) private returns (uint256 uniQuoterGasUsage, uint256 multiQuoterGasUsage) {
        uint256 gas0 = gasleft();
        (uint256[] memory multiQuoterAmountsOut, ) = multiQuoter.quoteExactMultiInput(factory, path, amountsIn);
        uint256 gas1 = gasleft();

        for (uint256 i = 0; i < amountsIn.length; ++i) {
            try uniQuoter.quoteExactInput(path, amountsIn[i]) returns (
                uint256 uniQuoterAmountOut,
                uint160[] memory /* sqrtPriceX96AfterList */,
                uint32[] memory /* initializedTicksCrossedList */,
                uint256 /* gasEstimate */
            ) {
                assertTrue(multiQuoterAmountsOut[i] < uniQuoterAmountOut + ERROR_THRESHOLD);
                assertTrue(multiQuoterAmountsOut[i] > uniQuoterAmountOut - ERROR_THRESHOLD);
            } catch {}
        }
        return (gas1 - gasleft(), gas0 - gas1);
    }
}
