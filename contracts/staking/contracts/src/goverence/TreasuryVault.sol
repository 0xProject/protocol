pragma solidity ^0.5.16;

// The following contract is designed to hold
// community tresury funds for the 0x protocol community

import "@0x/contracts-erc20/contracts/src/interfaces/IERC20Token.sol";
import "@0x/contracts-utils/contracts/src/Authorizable.sol";


contract TreasuryVault is Authorizable {

    // The address which is allowed to spend funds
    address public governor;

    // Zrx Token
    IERC20Token internal _zrxToken;

    // Timelocked pull based payment storage
    // Allows a user to recive funds after a timeperiod has elapsed
    mapping(address => PendingPayment) public pendingPayments;

    struct PendingPayment {
        uint256 releaseTime;
        uint256 amount;
    }

    /// @dev The constructor sets onchain goverance, the zrx token
    /// it also sets the msg.sender as the first authorized address
    /// The authorized addresss will have the power to reclaim added funds.
    /// @param _governor The contract allowed to spend funds
    /// @param zrxToken The ZRX token address
    constructor(address _governor, address zrxToken) public Authorizable() {
        governor = _governor;
        _zrxToken = IERC20Token(zrxToken);
        // Explicitly authorize the msg.sender
        _addAuthorizedAddress(msg.sender);
    }

    // Requires the msg.sender is the governor contract
    modifier onlyGoverance {
        require(msg.sender == governor, "Sender not authorized");
        _;
    }

    /// @dev Allows the goverance to send funds to a user
    /// @param to the address to send tokens to
    /// @param amount the amount of ZRX token
    function sendZRX(address to, uint256 amount) external onlyGoverance() {
        _zrxToken.transfer(to, amount);
    }

    /// @dev Allows the goverance to stop payment by deleting the record
    /// @param who The address who's payment is being removed
    function cancelPayment(address who) external onlyGoverance() {
        delete pendingPayments[who];
    }

    /// @dev Allows the goverance to queue funds to be sent to a user
    /// Note - An address can only have one pending payment at a time
    /// however to issue more funds goverance can use this same method
    /// to overwrite the old payment with a new one with increased amount
    /// or time.
    /// @param to the address which will be allowed to claim paymen
    /// @param amount the amount of zrx they can claim
    /// @param time the unix time in seconds at which they will begin
    /// to be allowed to claim the tokens
    function optimisticallySendZRX(address to, uint256 amount, uint256 time) 
        external
        onlyGoverance() 
    {
        pendingPayments[to] = PendingPayment(time, amount);
    }

    /// @dev Allows a user to claim the payment owed to them as long as 
    /// time has elapsed 
    function claimPayment() external {
        address who = msg.sender;
        PendingPayment memory payment = pendingPayments[who];
        require(payment.releaseTime != 0, "No payment exists");
        require(payment.releaseTime < block.timestamp, "Not claimable yet");
        _zrxToken.transfer(who, payment.amount);
        delete pendingPayments[who];
    }

    /// @dev Privileged function which allows the authorized address
    /// or governor to change the governor
    /// @param newGovernor the new governor address
    function changeGovernor(address newGovernor) external {
        // We check the msg.sender is the current goverance or an authorized address
        require((msg.sender == governor) || (authorized[msg.sender]), "Sender not authorized");
        governor = newGovernor;
    }

    /// @dev Privileged function which allows the authorized address to reclaim
    /// the community funds in this contract
    /// @param destination The address to send the reclaimed funds too
    function reclaimZRX(address destination) external onlyAuthorized() {
        uint256 currentBalance = _zrxToken.balanceOf(address(this));
        _zrxToken.transfer(destination, currentBalance);
    }
}
