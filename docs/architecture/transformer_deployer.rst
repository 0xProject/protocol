###############################
Transformer Deployer
###############################

`Transformers <./transformers.html>`_ need to be permissioned because they are executed in the context of the `Flash Wallet <./flash_wallet.html>`_. This means that a malicious Transformer could grief the protocol by destroying the Flash Wallet via ``selfdestruct``, so we need some way to authenticate that the Transformer is safe to use at runtime. 

The Transformer Deployer ``create``'s all Transformers, and its deployment nonce is used to validate a Transformer at runtime. The deployer is owned by 0x Labs, so only we are able to deploy Transformers. 

The deployer implements two functions: ``deploy()`` and ``kill()``. The former is used to deploy new Transformers; it will emit a `Deployed <../basics/events.html#deployed>`_ event (that includes the nonce) or reverts if it fails to ``create`` the Transformer. The ``kill()`` function is used to destroy deprecated Transformers; this emits a `Killed <../basics/events.html#killed>`_ event or reverts if the Transformer's ``die()`` function reverts. Note that we cannot verify a Transformer called ``selfdestruct`` in the ``kill`` function because this information is not available until after the transaction executes.

.. code-block:: solidity

    /// @dev Deploy a new contract. Only callable by an authority.
    ///      Any attached ETH will also be forwarded.
    function deploy(bytes memory bytecode)
        public
        payable
        onlyAuthorized
        returns (address deployedAddress);

    /// @dev Call `die()` on a contract. Only callable by an authority.
    /// @param target The target contract to call `die()` on.
    /// @param ethRecipient The Recipient of any ETH locked in `target`.
    function kill(IKillable target, address payable ethRecipient)
        public
        onlyAuthorized;

View the code for the Transformer Deployer `here <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/external/TransformerDeployer.sol>`__.


Permissionless Transfomer Deployer
===================================

A permissionless deployer has been developed and can be seen `here <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/external/PermissionlessTransformerDeployer.sol>`__. This serves a similar function to the current delployer, only it is capable of validating the Transformer's bytecode before deploying. It does this by tracing the bytecode in search of reachable opcodes that could post a threat to the Flash Wallet. 

The ``isDelegateCallSafe`` function performs this check. It will return ``false`` if any of the following opcodes are reachable: ``callcode``, ``delegatecall``, ``selfdestruct``, ``create``, ``create2``, ``sload``, ``sstore``. 

.. code-block:: solidity

    /// @dev Checks whether a given address is safe to be called via
    ///      delegatecall. A contract is considered unsafe if it includes any
    ///      of the following opcodes: CALLCODE, DELEGATECALL, SELFDESTRUCT,
    ///      CREATE, CREATE2, SLOAD, and STORE. This code is adapted from
    ///      https://github.com/dharma-eng/dharma-smart-wallet/blob/master/contracts/helpers/IndestructibleRegistry.sol
    /// @param target The address to check.
    /// @return True if the contract is considered safe for delegatecall.
    function isDelegateCallSafe(address target) public view returns (bool);

THe ``deploy`` function is similar to the existing Transformer Deployer, only it uses a user-provided nonce to deploy the Transformer.

.. code-block:: solidity

    /// @dev Deploy a new contract. Any attached ETH will be forwarded.
    function deploy(bytes memory bytecode, bytes32 salt)
        public
        payable
        returns (address deployedAddress);


Note that there is no ``kill`` function in this deployer.

View the code for the Permissionless Transformer Deployer `here <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/external/PermissionlessTransformerDeployer.sol>`_.

There is some overhead to switching over to this deployer, as the `Flash Wallet <./flash_wallet.html>`_ would need to be redeployed and some integrators would need to update their code. Therefore, this will be put into production once there is community-demand for permissionless transformers. Reach out to us on `Discord <https://discord.com/invite/d3FTX3M>`_ if you'd like to deploy a Transformer!