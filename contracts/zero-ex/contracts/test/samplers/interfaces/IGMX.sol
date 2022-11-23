pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

interface IGMX {
    function getMaxAmountIn(IVault _vault, address _tokenIn, address _tokenOut) external view returns (uint256);

    function getAmountOut(
        IVault _vault,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) external view returns (uint256, uint256);
}

interface IVault {
    function getFeeBasisPoints(
        address _token,
        uint256 _usdgDelta,
        uint256 _feeBasisPoints,
        uint256 _taxBasisPoints,
        bool _increment
    ) external view returns (uint256);

    function stableSwapFeeBasisPoints() external view returns (uint256);

    function stableTokens(address _token) external view returns (bool);

    function tokenDecimals(address _token) external view returns (uint256);

    function getMaxPrice(address _token) external view returns (uint256);

    function getMinPrice(address _token) external view returns (uint256);
}
