pragma solidity ^0.5.16;

// This contract if funded with ZRX can distribute onchain
// voting power to delegatees in any amount profile.

import "./Staker.sol";
import "../interfaces/IOnchainGov.sol";
import "../interfaces/IStaking.sol";
import "@0x/contracts-erc20/contracts/src/interfaces/IERC20Token.sol";
import "@0x/contracts-utils/contracts/src/Authorizable.sol";
import "@0x/contracts-asset-proxy/contracts/src/interfaces/IAssetProxy.sol";


contract BootstrapFactory is Authorizable {
    // A stored address for the ZRX token
    IERC20Token public zrxToken;
    // A stored address for the x staking contract
    IStaking public zrxStaking;
    // A stored address for the zrx onchain gov contract
    IOnchainGov public zrxOnchainGov;
    // A stored address for the zrx asset proxy
    IAssetProxy public zrxAssetProxy;
    // A mapping from addresses to deployed subcontracts
    mapping(address => Staker) public stakingContracts;

    /// @dev This function constructs the contract
    /// @param _zrxToken The ZRX token address
    /// @param _zrxStaking The 0x staking address
    /// @param _zrxOnchainGov The 0x gov address
    constructor(
        IERC20Token _zrxToken, 
        IStaking _zrxStaking, 
        IOnchainGov _zrxOnchainGov,
        IAssetProxy _zrxAssetProxy) 
        public Authorizable() 
    {
        zrxToken = _zrxToken;
        zrxStaking = _zrxStaking;
        zrxOnchainGov = _zrxOnchainGov;
        zrxAssetProxy = _zrxAssetProxy;
        _addAuthorizedAddress(msg.sender);
    }

    /// @dev Allows authorized addresses to use the ZRX token in this
    /// contract to delegate voting power to someone
    /// @param delegatee The address to delegate too
    /// @param amount The amount of ZRX to delegate to them
    function delegate(address delegatee, uint256 amount) external onlyAuthorized() {
        _delegate(delegatee, amount);
    }

    /// @dev Allows authorized addresses to use the ZRX token in this
    /// contract to delegate voting power to many addresses at once
    /// @param delegatees The addresses to delegate too
    /// @param amounts The amounts to delegate to each address
    function delegateMany(address[] calldata delegatees, uint256[] calldata amounts) external onlyAuthorized() {
        for (uint256 i = 0; i < delegatees.length; i++) {
            _delegate(delegatees[i], amounts[i]);
        }
    }

    /// @dev Allows authorized addresses to undelgate from a user
    /// and send the ZRX back to this contract
    /// @param delegatee The address to undelegate
    /// @param amount The amount of ZRX to undelegate
    function undelegate(address delegatee, uint256 amount) external onlyAuthorized() {
        _undelegate(delegatee, amount);
    }

    /// @dev Allows authorized addresses to undelgate from many
    /// users and send the ZRX back to this contract
    /// @param delegatees The addresses to undelegate
    /// @param amounts The amounts of ZRX to undelegate
    function undelegateMany(address[] calldata delegatees, uint256[] calldata amounts) external onlyAuthorized() {
        for (uint256 i = 0; i < delegatees.length; i++) {
            _undelegate(delegatees[i], amounts[i]);
        }
    }

    /// @dev Allows an authorized address to remove the zrx token balance
    /// from this contract and then send it somewhere
    /// @param destination The address which recives the ZRX
    /// @param amount The amount of ZRX to send out of the contract
    function removeZRX(address destination, uint256 amount) external onlyAuthorized() {
        zrxToken.transfer(destination, amount);
    }

    /// @dev Delegates to someone by either deploying a subcontract
    /// which deposits and delgates voting power or calling a sub
    /// contract to increase delegated amount
    /// @param delegatee The address to delegate too
    /// @param amount The amount of ZRX to delegate to them
    function _delegate(address delegatee, uint256 amount) internal {
        // Try to load the staking contract for this user
        Staker userStaking = stakingContracts[delegatee];

        if (address(userStaking) == address(0)) {
            // If undeployed go through the deployment flow
            // Create the contract
            Staker staker = new Staker();
            // Store that this contract address has been created
            stakingContracts[delegatee] = staker;
            // Transfer it 'amount' ZRX token
            zrxToken.transfer(address(staker), amount);
            // Call the first staking method to stake and delegate
            staker.firstStake(zrxStaking, zrxOnchainGov, zrxToken, zrxAssetProxy, delegatee, amount);
        } else {
            // Otherwise we add amount to the currently staked balance
            // First transfer ZRX to the Staker
            zrxToken.transfer(address(userStaking), amount);
            // Then we stake the rest of the stake to zrx
            userStaking.addVotes(zrxStaking, amount);
        }
    }

    /// @dev The internal method which undelegates from a user
    /// by calling reclaim on the contract which contains the funds
    /// provisioned to that user.
    /// @param delegatee The address to undelegate
    /// @param amount The amount of ZRX to undelegate
    function _undelegate(address delegatee, uint256 amount) internal {
        // Try to load the staking contract for this user
        Staker userStaking = stakingContracts[delegatee];
        require(address(userStaking) != address(0), "Delegatee does not exist");
        // Remove the delegatee's voting power and remand ZRX to this contract
        userStaking.reclaim(zrxStaking, zrxToken, amount);
    }
}
