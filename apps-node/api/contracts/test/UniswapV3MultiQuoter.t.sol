pragma solidity >=0.6.5;
pragma experimental ABIEncoderV2;

import "forge-std/Test.sol";
import "../src/UniswapV3MultiQuoter.sol";
import "../src/UniswapV3Common.sol";

interface IUniswapV3QuoterV2 {
    /// @return Returns the address of the Uniswap V3 factory
    function factory() external view returns (IUniswapV3Factory);

    // @notice Returns the amount out received for a given exact input swap without executing the swap
    // @param path The path of the swap, i.e. each token pair and the pool fee
    // @param amountIn The amount of the first token to swap
    // @return amountOut The amount of the last token that would be received
    // @return sqrtPriceX96AfterList List of the sqrt price after the swap for each pool in the path
    // @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
    // @return gasEstimate The estimate of the gas that the swap consumes
    function quoteExactInput(
        bytes memory path,
        uint256 amountIn
    )
        external
        returns (
            uint256 amountOut,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );

    // @notice Returns the amount in required for a given exact output swap without executing the swap
    // @param path The path of the swap, i.e. each token pair and the pool fee. Path must be provided in reverse order
    // @param amountOut The amount of the last token to receive
    // @return amountIn The amount of first token required to be paid
    // @return sqrtPriceX96AfterList List of the sqrt price after the swap for each pool in the path
    // @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
    // @return gasEstimate The estimate of the gas that the swap consumes
    function quoteExactOutput(
        bytes memory path,
        uint256 amountOut
    )
        external
        returns (
            uint256 amountIn,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );
}

contract TestUniswapV3MultiQuoter is Test, UniswapV3Common {
    /// @dev error threshold in wei for comparison between MultiQuoter and UniswapV3's official QuoterV2.
    /// MultiQuoter results in some rounding errors due to SqrtPriceMath library.
    uint256 constant ERROR_THRESHOLD = 125;

    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant FRAX = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
    address constant RAI = 0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919;

    address constant DAI_FRAX_POOL_5_BIP = 0x97e7d56A0408570bA1a7852De36350f7713906ec;
    address constant RAI_FRAX_POOL_30_BIP = 0xd3f3bf0b928551661503Ce43BC456BBdF725986a;

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

    function testSingleHopQuotesForLiquidPools() public {
        address[] memory tokenPath = new address[](2);
        tokenPath[0] = DAI;
        tokenPath[1] = FRAX;

        address[] memory poolPath = new address[](1);
        poolPath[0] = DAI_FRAX_POOL_5_BIP;

        testAllAmountsAndPathsForBuysAndSells(tokenPath, poolPath);
    }

    function testSingleHopQuotesForIlliquidPools() public {
        address[] memory tokenPath = new address[](2);
        tokenPath[0] = RAI;
        tokenPath[1] = FRAX;

        address[] memory poolPath = new address[](1);
        poolPath[0] = RAI_FRAX_POOL_30_BIP;

        testAllAmountsAndPathsForBuysAndSells(tokenPath, poolPath);
    }

    function testMultiHopQuotes() public {
        address[] memory tokenPath = new address[](3);
        tokenPath[0] = DAI;
        tokenPath[1] = FRAX;
        tokenPath[2] = RAI;

        address[] memory poolPath = new address[](2);
        poolPath[0] = DAI_FRAX_POOL_5_BIP;
        poolPath[1] = RAI_FRAX_POOL_30_BIP;

        testAllAmountsAndPathsForBuysAndSells(tokenPath, poolPath);
    }

    function testAllAmountsAndPathsForBuysAndSells(address[] memory tokenPath, address[] memory poolPath) private {
        uint256 uniQuoterGasUsage;
        uint256 multiQuoterGasUsage;

        bytes memory path = toUniswapPath(tokenPath, poolPath);
        bytes memory reversePath = toUniswapPath(reverseAddressPath(tokenPath), reverseAddressPath(poolPath));

        console.log("Quoter Gas Comparison ");
        console.log("Token Path: ");
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            console.logAddress(address(tokenPath[i]));
        }

        for (uint256 i = 0; i < testAmounts.length; ++i) {
            (uniQuoterGasUsage, multiQuoterGasUsage) = compareQuoterSells(path, testAmounts[i]);
            console.log(
                "Normal Path Sell: test=%d, uniQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                uniQuoterGasUsage,
                multiQuoterGasUsage
            );
            (uniQuoterGasUsage, multiQuoterGasUsage) = compareQuoterSells(reversePath, testAmounts[i]);
            console.log(
                "Reverse Path Sell: test=%d, uniQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                uniQuoterGasUsage,
                multiQuoterGasUsage
            );
            (uniQuoterGasUsage, multiQuoterGasUsage) = compareQuoterBuys(path, testAmounts[i]);
            console.log(
                "Normal Path Buy: test=%d, uniQuoterGasUsage=%d, multiQuoterGasUsage=%d",
                i + 1,
                uniQuoterGasUsage,
                multiQuoterGasUsage
            );
            (uniQuoterGasUsage, multiQuoterGasUsage) = compareQuoterBuys(reversePath, testAmounts[i]);
            console.log(
                "Reverse Path Buy: test=%d, uniQuoterGasUsage=%d, multiQuoterGasUsage=%d",
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
        uint256[] memory multiQuoterAmountsOut;
        try multiQuoter.quoteExactMultiInput(address(factory), path, amountsIn) {} catch (bytes memory reason) {
            (, multiQuoterAmountsOut, ) = decodeMultiSwapRevert(reason);
        }
        uint256 gas1 = gasleft();

        for (uint256 i = 0; i < amountsIn.length; ++i) {
            try uniQuoter.quoteExactInput(path, amountsIn[i]) returns (
                uint256 uniQuoterAmountOut,
                uint160[] memory /* sqrtPriceX96AfterList */,
                uint32[] memory /* initializedTicksCrossedList */,
                uint256 /* gasEstimate */
            ) {
                assertLt(
                    multiQuoterAmountsOut[i],
                    uniQuoterAmountOut + ERROR_THRESHOLD,
                    "compareQuoterSells: MultiQuoter amount is too high compared to UniQuoter amount"
                );
                assertGt(
                    multiQuoterAmountsOut[i],
                    uniQuoterAmountOut - ERROR_THRESHOLD,
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
    ) private returns (uint256 uniQuoterGasUsage, uint256 multiQuoterGasUsage) {
        uint256 gas0 = gasleft();
        uint256[] memory multiQuoterAmountsIn;
        try multiQuoter.quoteExactMultiOutput(address(factory), path, amountsOut) {} catch (bytes memory reason) {
            (, multiQuoterAmountsIn, ) = decodeMultiSwapRevert(reason);
        }
        uint256 gas1 = gasleft();

        for (uint256 i = 0; i < amountsOut.length; ++i) {
            try uniQuoter.quoteExactOutput(path, amountsOut[i]) returns (
                uint256 uniQuoterAmountIn,
                uint160[] memory /* sqrtPriceX96AfterList */,
                uint32[] memory /* initializedTicksCrossedList */,
                uint256 /* gasEstimate */
            ) {
                assertLt(
                    multiQuoterAmountsIn[i],
                    uniQuoterAmountIn + ERROR_THRESHOLD,
                    "compareQuoterBuys: MultiQuoter amount is too high compared to UniQuoter amount"
                );
                assertGt(
                    multiQuoterAmountsIn[i],
                    uniQuoterAmountIn - ERROR_THRESHOLD,
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

    function testWarmStorage() public {
        address[] memory tokenPath = new address[](3);
        tokenPath[0] = 0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919; // RAI
        tokenPath[1] = 0x6B175474E89094C44Da98b954EedeAC495271d0F; // DAI
        tokenPath[2] = 0x111111111117dC0aa78b770fA6A738034120C302; // 1INCH

        uint256 inputAmount = 228852900000000000000000;
        uint256[] memory amounts = new uint256[](13);
        for (uint256 i = 0; i < amounts.length; ++i) {
            amounts[i] = (i + 1) * (inputAmount / 13);
        }

        bytes
            memory path = hex"03ab458634910aad20ef5f1c8ee96f1d6ac549190001f46b175474e89094c44da98b954eedeac495271d0f002710111111111117dc0aa78b770fa6a738034120c302";

        console.log("UQ Cold Read");
        for (uint256 i = 0; i < amounts.length; ++i) {
            try uniQuoter.quoteExactInput(path, amounts[i]) returns (
                uint256 /* amountOut */,
                uint160[] memory /* sqrtPriceX96AfterList */,
                uint32[] memory /* initializedTicksCrossedList */,
                uint256 uqGasEstimate
            ) {
                console.log("UQ Gas Estimates: i=%d, UQ: %d", i, uqGasEstimate);
            } catch {}
        }

        console.log("UQ Warm Read");

        for (uint256 i = 0; i < amounts.length; ++i) {
            try uniQuoter.quoteExactInput(path, amounts[i]) returns (
                uint256 /* amountOut */,
                uint160[] memory /* sqrtPriceX96AfterList */,
                uint32[] memory /* initializedTicksCrossedList */,
                uint256 uqGasEstimate
            ) {
                console.log("UQ Gas Estimates: i=%d, UQ: %d", i, uqGasEstimate);
            } catch {}
        }

        console.log("MQ Cold Read");

        {
            uint256[] memory mqGasEstimates;
            try multiQuoter.quoteExactMultiInput(address(factory), path, amounts) {} catch (bytes memory reason) {
                (, , mqGasEstimates) = decodeMultiSwapRevert(reason);
            }
            for (uint256 i = 0; i < amounts.length; ++i) {
                console.log("MQ Gas Estimates: i=%d, MQ: %d", i, mqGasEstimates[i]);
            }
        }

        console.log("MQ Warm Read");

        {
            uint256[] memory mqGasEstimates;
            try multiQuoter.quoteExactMultiInput(address(factory), path, amounts) {} catch (bytes memory reason) {
                (, , mqGasEstimates) = decodeMultiSwapRevert(reason);
            }
            for (uint256 i = 0; i < amounts.length; ++i) {
                console.log("MQ Gas Estimates: i=%d, MQ: %d", i, mqGasEstimates[i]);
            }
        }
    }
}
