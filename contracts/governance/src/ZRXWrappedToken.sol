// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2023 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/
pragma solidity ^0.8.19;

import "@openzeppelin/token/ERC20/ERC20.sol";
import "@openzeppelin/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/token/ERC20/extensions/ERC20Wrapper.sol";
import "@openzeppelin/governance/utils/IVotes.sol";
import "./IZeroExVotes.sol";

contract ZRXWrappedToken is ERC20, ERC20Permit, ERC20Wrapper {
    constructor(
        IERC20 wrappedToken,
        IZeroExVotes _zeroExVotes
    ) ERC20("Wrapped ZRX", "wZRX") ERC20Permit("Wrapped ZRX") ERC20Wrapper(wrappedToken) {
        zeroExVotes = _zeroExVotes;
    }

    IZeroExVotes public zeroExVotes;
    mapping(address => address) private _delegates;

    bytes32 private constant _DELEGATION_TYPEHASH =
        keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

    /**
     * @dev Emitted when an account changes their delegate.
     */
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);

    // The functions below are the required overrides from the base contracts

    function decimals() public pure override(ERC20, ERC20Wrapper) returns (uint8) {
        return 18;
    }

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20) {
        super._afterTokenTransfer(from, to, amount);

        // Move voting power when tokens are transferred.
        zeroExVotes.movePartialVotingPower(delegates(from), delegates(to), balanceOf(from), balanceOf(to), amount);
    }

    function _mint(address account, uint256 amount) internal override(ERC20) {
        super._mint(account, amount);

        // Snapshots the totalSupply after it has been increased.
        zeroExVotes.writeCheckpointTotalSupplyMint(amount, balanceOf(account));
    }

    function _burn(address account, uint256 amount) internal override(ERC20) {
        super._burn(account, amount);

        // Snapshots the totalSupply after it has been decreased.
        zeroExVotes.writeCheckpointTotalSupplyBurn(amount, balanceOf(account));
    }

    /**
     * @dev Get the address `account` is currently delegating to.
     */
    function delegates(address account) public view returns (address) {
        return _delegates[account];
    }

    /**
     * @dev Delegate votes from the sender to `delegatee`.
     */
    function delegate(address delegatee) public {
        _delegate(_msgSender(), delegatee);
    }

    /**
     * @dev Delegates votes from signer to `delegatee`
     */
    function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) public {
        require(block.timestamp <= expiry, "ERC20Votes: signature expired");
        address signer = ECDSA.recover(
            _hashTypedDataV4(keccak256(abi.encode(_DELEGATION_TYPEHASH, delegatee, nonce, expiry))),
            v,
            r,
            s
        );
        require(nonce == _useNonce(signer), "ERC20Votes: invalid nonce");
        _delegate(signer, delegatee);
    }

    /**
     * @dev Change delegation for `delegator` to `delegatee`.
     *
     * Emits events {DelegateChanged} and {IZeroExVotes-DelegateVotesChanged}.
     */
    function _delegate(address delegator, address delegatee) internal virtual {
        address currentDelegate = delegates(delegator);
        uint256 delegatorBalance = balanceOf(delegator);
        _delegates[delegator] = delegatee;

        emit DelegateChanged(delegator, currentDelegate, delegatee);

        zeroExVotes.moveVotingPower(currentDelegate, delegatee, delegatorBalance);
    }
}
