pragma solidity ^0.5.16;

// This contract is created and owned by a factory to
// stake and delegate from a different address

import "../interfaces/IOnchainGov.sol";
import "../interfaces/IStaking.sol";
import "@0x/contracts-erc20/contracts/src/interfaces/IERC20Token.sol";
import "@0x/contracts-asset-proxy/contracts/src/interfaces/IAssetProxy.sol";


contract Staker {

    // The contract which gives and can recall the
    // ZRX which is staked with
    address public owner;

    /// @dev This function constructs the contract
    /// and sets the owner
    constructor() public {
        // Store the caller as the owner
        owner = msg.sender;
    }

    /// @dev After creation the owner should call this method
    /// to create a staked position from the ZRX transfered
    /// to this contract
    /// @param zrxStaking the 0x staking contract
    /// @param zrxOnchainGov the 0x onchain gov contract
    /// @param zrxToken the ZRX token contract
    /// @param delegatee The address to delegate to
    /// @param amount the amount of ZRX to deposit
    function firstStake( 
        IStaking zrxStaking,
        IOnchainGov zrxOnchainGov,
        IERC20Token zrxToken,
        IAssetProxy zrxAssetProxy,
        address delegatee,
        uint256 amount
    ) external  {
        require(msg.sender == owner, "Caller lacks permissions");
        // Allow staking to spend any amount of zrx from this contract
        zrxToken.approve(address(zrxAssetProxy), 1<<255);
        // Use 0x staking to stake
        zrxStaking.stake(amount);
        // Call delegate on the ZRX onchain gov contracts
        // to delegate this contract's power to the 'delegatee'
        zrxOnchainGov.delegate(delegatee);
    }

    /// @dev This function allow the factory contract to 
    /// reclaim the ZRX currently staked through this proxy.
    /// @param zrxStaking The ZRX staking contract
    /// @param amount The amount of ZRX to reclaim
    function reclaim(IStaking zrxStaking, IERC20Token zrxToken, uint256 amount) external {
        require(msg.sender == owner, "Caller lacks permissions");
        // Use 0x staking to unstake
        // This should send the amount of tokens to this contract
        zrxStaking.unstake(amount);
        // We then send those tokens back to the owner
        zrxToken.transfer(msg.sender, amount);
    }

    /// @dev This function allows the factory contract to increase the
    /// amount staked and then delegated.
    /// Note - The ZRX tokens must be transfered to this address before
    /// this function is called and firstStake should have been called
    /// at some point
    /// @param zrxStaking The ZRX staking contract
    /// @param amount the amount of ZRX
    function addVotes(IStaking zrxStaking, uint256 amount) external {
        require(msg.sender == owner, "Caller lacks permissions");
        // Use 0x staking to stake
        // This will automaticilly increase voting power for the
        // delegatee this contract is deployed to bootstrap.
        zrxStaking.stake(amount);
    }
}
