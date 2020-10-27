###############################
Flash Wallet
###############################

The Flash Wallet is a sandboxed escrow contract that holds funds for `Transformers <./transformers.html>`_ to operate on. A `Feature <./features.html>`_ contract transfers tokens to the Flash Wallet, which then delegate call's into a Transformer to run operations on the escrowed funds. Transformers are trustless and therefore only have access to the funds deposted into the Flash Wallet; they do not have access to user allowances. 

The wallet is currently only used by the ``TransformERC20`` feature. It is deployed using the  ``createTransformWallet()`` function on the feature, which is only callable by the owner/governor. This allows us to deploy a fresh wallet in case we somehow break the old one, like if we accidentally selfdestruct it or clobber its state.

.. note::
    The wallet is currently only used for ERC20 tokens, but can be extended to work with other standards, like ERC1155 and ERC223, by implementing the required fallbacks for those standards.

The Flash Wallet exposes two functions of interest: ``executeCall()`` and ``executeDelegateCall()``. The former executes a ``call`` and reverts if the callee reverts. The latter executes a ``delegatecall`` and reverts if the callee reverts.

.. code-block:: solidity

    /// @dev Execute an arbitrary call. Only an authority can call this.
    /// @param target The call target.
    /// @param callData The call data.
    /// @param value Ether to attach to the call.
    /// @return resultData The data returned by the call.
    function executeCall(
        address payable target,
        bytes calldata callData,
        uint256 value
    )
        external
        payable
        override
        onlyOwner
        returns (bytes memory resultData);

    /// @dev Execute an arbitrary delegatecall, in the context of this puppet.
    ///      Only an authority can call this.
    /// @param target The call target.
    /// @param callData The call data.
    /// @return resultData The data returned by the call.
    function executeDelegateCall(
        address payable target,
        bytes calldata callData
    )
        external
        payable
        override
        onlyOwner
        returns (bytes memory resultData);

View the code for the Flash Wallet `here <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/external/FlashWallet.sol>`_.