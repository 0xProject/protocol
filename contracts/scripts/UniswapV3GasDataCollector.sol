pragma solidity >=0.6.5;
pragma experimental ABIEncoderV2;

import "forge-std/Script.sol";

import "../src/interfaces/IUniswapV3.sol";
import "../src/UniswapV3MultiQuoter.sol";
import "../src/UniswapV3Common.sol";

/// @title Writes UniswapV3 gas estimates to file
/// @notice Gas estimates for UniswapV3QuoterV2 and UniswapV3MultiQuoter are written with each quote function
/// being called from a clean slate (no warm storage reads). UniswapV3QuoterV2 reverts at the end of the quote
/// function while UniswapV3MultiQuoter doesn't. Hence, after very call to UniswapV3MultiQuoter's quote function,
/// the data writer's functions revert.
contract UniswapV3GasDataWriter is Script, UniswapV3Common {
    string private filePath;
    IUniswapV3QuoterV2 private immutable uniQuoter;
    IUniswapV3MultiQuoter private immutable multiQuoter;
    IUniswapV3Factory private immutable factory;

    string private constant headers = "path,amount,isInput,ticksCrossed,mqGasEstimate,uqGasEstimate";

    constructor(
        string memory filePath_,
        IUniswapV3QuoterV2 uniQuoter_,
        IUniswapV3MultiQuoter multiQuoter_,
        IUniswapV3Factory factory_
    ) {
        filePath = filePath_;
        uniQuoter = uniQuoter_;
        multiQuoter = multiQuoter_;
        factory = factory_;

        // write the CSV file headers
        vm.writeLine(filePath, headers);
    }

    /// @notice Writes exact input gas estimates for given UniswapV3 path and set of amounts.
    /// @param uniswapPath The path of the swap, i.e. each token pair and the pool fee
    /// @param amounts The amounts in of the first token to swap
    function writeGasDataForExactInputs(bytes memory uniswapPath, uint256[] memory amounts) external {
        uint32[] memory uqTicksCrossed = new uint32[](amounts.length);
        uint256[] memory uqInputGasEst = new uint256[](amounts.length);

        for (uint256 i = 0; i < amounts.length; ++i) {
            try uniQuoter.quoteExactInput{gas: 700e3}(uniswapPath, amounts[i]) returns (
                uint256,
                uint160[] memory,
                uint32[] memory ticksCrossed,
                uint256 gasEstimate
            ) {
                uqTicksCrossed[i] = ticksCrossed[0];
                uqInputGasEst[i] = gasEstimate;
            } catch {}
        }

        uint256[] memory mqInputGasEst;
        try multiQuoter.quoteExactMultiInput(factory, uniswapPath, amounts) {} catch (bytes memory reason) {
            (, , mqInputGasEst) = catchMultiSwapResult(reason);
        }

        for (uint256 i = 0; i < amounts.length; ++i) {
            if (mqInputGasEst[i] == 0 || uqInputGasEst[i] == 0) {
                continue;
            }

            string memory pathStr = toHexString(uniswapPath);
            string memory amountStr = toHexString(abi.encodePacked(amounts[i]));
            string memory ticksCrossedStr = toHexString(abi.encodePacked(uqTicksCrossed[i]));
            string memory mqGasEstimateStr = toHexString(abi.encodePacked(mqInputGasEst[i]));
            string memory uqGasEstimateStr = toHexString(abi.encodePacked(uqInputGasEst[i]));
            string memory row = string(
                abi.encodePacked(
                    pathStr,
                    ",",
                    amountStr,
                    ",",
                    "TRUE",
                    ",",
                    ticksCrossedStr,
                    ",",
                    mqGasEstimateStr,
                    ",",
                    uqGasEstimateStr
                )
            );
            vm.writeLine(filePath, row);
        }
        revert(); // revert to clear warm storage from multiquoter
    }

    /// @notice Writes exact output gas estimates for given UniswapV3 path and set of amounts.
    /// @param uniswapPath The path of the swap, i.e. each token pair and the pool fee
    /// @param amounts The amounts out of the first token to swap
    function writeGasDataForExactOutputs(bytes memory uniswapPath, uint256[] memory amounts) external {
        uint32[] memory uqTicksCrossed = new uint32[](amounts.length);
        uint256[] memory uqOutputGasEst = new uint256[](amounts.length);

        for (uint256 i = 0; i < amounts.length; ++i) {
            try uniQuoter.quoteExactOutput{gas: 700e3}(uniswapPath, amounts[i]) returns (
                uint256,
                uint160[] memory,
                uint32[] memory ticksCrossed,
                uint256 gasEstimate
            ) {
                uqTicksCrossed[i] = ticksCrossed[0];
                uqOutputGasEst[i] = gasEstimate;
            } catch {}
        }

        uint256[] memory mqOutputGasEst;
        try multiQuoter.quoteExactMultiOutput(factory, uniswapPath, amounts) {} catch (bytes memory reason) {
            (, , mqOutputGasEst) = catchMultiSwapResult(reason);
        }

        for (uint256 i = 0; i < amounts.length; ++i) {
            if (mqOutputGasEst[i] == 0 || uqOutputGasEst[i] == 0) {
                continue;
            }

            string memory pathStr = toHexString(uniswapPath);
            string memory amountStr = toHexString(abi.encodePacked(amounts[i]));
            string memory ticksCrossedStr = toHexString(abi.encodePacked(uqTicksCrossed[i]));
            string memory mqGasEstimateStr = toHexString(abi.encodePacked(mqOutputGasEst[i]));
            string memory uqGasEstimateStr = toHexString(abi.encodePacked(uqOutputGasEst[i]));
            string memory row = string(
                abi.encodePacked(
                    pathStr,
                    ",",
                    amountStr,
                    ",",
                    "FALSE",
                    ",",
                    ticksCrossedStr,
                    ",",
                    mqGasEstimateStr,
                    ",",
                    uqGasEstimateStr
                )
            );
            vm.writeLine(filePath, row);
        }
        revert(); // revert to clear warm storage from multiquoter
    }

    function toHexString(bytes memory buffer) private pure returns (string memory) {
        // Fixed buffer size for hexadecimal convertion
        bytes memory converted = new bytes(buffer.length * 2);

        bytes memory _base = "0123456789abcdef";

        for (uint256 i = 0; i < buffer.length; i++) {
            converted[i * 2] = _base[uint8(buffer[i]) / _base.length];
            converted[i * 2 + 1] = _base[uint8(buffer[i]) % _base.length];
        }

        return string(abi.encodePacked("0x", converted));
    }
}

/// @title Iterates through multiple token paths and pools and writes gas estimate data to file.
/// @notice The generated CSV file should be used †o perform a linear regression between
/// UniswapV3QuoterV2 gas results and UniswapV3MultiQuoter gas results. The results from those regression
/// should be used to populate gas scaling parameters for UniswapV3MultiQuoter.
contract UniswapV3GasDataCollector is Script, UniswapV3Common {
    IUniswapV3QuoterV2 private constant uniQuoter = IUniswapV3QuoterV2(0x61fFE014bA17989E743c5F6cB21bF9697530B21e);

    IUniswapV3Factory private factory;
    UniswapV3MultiQuoter private multiQuoter;

    string private constant filePath = "UniswapV3GasData.csv";

    function setUp() public {
        factory = uniQuoter.factory();
        multiQuoter = new UniswapV3MultiQuoter();
    }

    function run() public {
        UniswapV3GasDataWriter w = new UniswapV3GasDataWriter(filePath, uniQuoter, multiQuoter, factory);

        address[12] memory tokenList;
        tokenList[0] = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // USDC
        tokenList[1] = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // WETH
        tokenList[2] = 0xdAC17F958D2ee523a2206206994597C13D831ec7; // USDT
        tokenList[3] = 0x6B175474E89094C44Da98b954EedeAC495271d0F; // DAI
        tokenList[4] = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599; // WBTC
        tokenList[5] = 0xD533a949740bb3306d119CC777fa900bA034cd52; // CRV
        tokenList[6] = 0x111111111117dC0aa78b770fA6A738034120C302; // 1INCH
        tokenList[7] = 0xE41d2489571d322189246DaFA5ebDe1F4699F498; // ZRX
        tokenList[8] = 0x4d224452801ACEd8B2F0aebE155379bb5D594381; // APE
        tokenList[9] = 0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919; // RAI
        tokenList[10] = 0x3845badAde8e6dFF049820680d1F14bD3903a5d0; // SAND
        tokenList[11] = 0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0; // MATIC

        uint256[][] memory amountsList = new uint256[][](10);
        for (uint256 i = 0; i < amountsList.length; ++i) {
            amountsList[i] = new uint256[](10);
            for (uint256 j = 0; j < amountsList[i].length; ++j) {
                amountsList[i][j] = (j + 1) * 10 ** (2 * i + 4);
            }
        }

        for (uint256 i = 0; i < tokenList.length; ++i) {
            for (uint256 j = 0; j < tokenList.length; ++j) {
                console.log("Processing i=%d, j=%d", i + 1, j + 1);
                console.log("--- %d / %d", i * tokenList.length + j + 1, tokenList.length * tokenList.length);

                if (i == j) {
                    continue;
                }

                IERC20TokenV06[] memory tokenPath = new IERC20TokenV06[](2);
                tokenPath[0] = IERC20TokenV06(tokenList[i]);
                tokenPath[1] = IERC20TokenV06(tokenList[j]);

                for (uint256 k = 0; k < amountsList.length; ++k) {
                    IUniswapV3Pool[][] memory poolPaths = getPoolPaths(
                        factory,
                        multiQuoter,
                        tokenPath,
                        amountsList[k][amountsList[k].length - 1]
                    );

                    for (uint256 l = 0; l < poolPaths.length; ++l) {
                        if (!isValidPoolPath(poolPaths[l])) {
                            continue;
                        }

                        bytes memory uniswapPath = toUniswapPath(tokenPath, poolPaths[l]);

                        try w.writeGasDataForExactInputs(uniswapPath, amountsList[k]) {} catch {}
                        try w.writeGasDataForExactOutputs(uniswapPath, amountsList[k]) {} catch {}
                    }
                }
            }
        }
    }
}
