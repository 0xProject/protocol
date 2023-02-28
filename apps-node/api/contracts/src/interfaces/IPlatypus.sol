pragma solidity ^0.6;

interface IPlatypus {
    function quotePotentialSwap(
        address fromToken,
        address toToken,
        uint256 fromAmount
    ) external view returns (uint256 potentialOutcome, uint256 haircut);

    function assetOf(address token) external view returns (address);
}
