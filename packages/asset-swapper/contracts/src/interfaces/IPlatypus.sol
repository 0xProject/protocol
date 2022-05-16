
pragma solidity ^0.6;

interface IPlatypus {
    function quotePotentialSwaps(
        address[] memory tokenPath,
        address[] memory poolPath,
        uint256 fromAmount
    ) external view returns (uint256 potentialOutcome, uint256 haircut);
}