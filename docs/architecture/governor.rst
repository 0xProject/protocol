###############################
Governor
###############################

.. note::

    This page is tailored for Exchange V4. For information on governance over past exhcange versions, see `this specification <https://github.com/0xProject/0x-protocol-specification/blob/master/v3/zero-ex-governor.md>`_.

The ``ZeroExGovernor`` is a time-locked multi-signature wallet that has permission to perform administrative functions within the protocol. Functions are timelocked (see below). Many functions that can be used to mitigate damage in case of emergencies (for example, if a vulnerability is discovered that puts user funds at risk) do not have a timelock.

The ``ZeroExGovernor`` is able to perform the following functions within the protocol:

Managing Ownership
==================

The ``ZeroExGovernor`` can transfer ownership of any contract for which it is the ``owner`` by calling the following function:

.. code-block:: solidity

    /// @dev Transfers ownership to a new address.
    /// @param newOwner Address of the new owner.
    function transferOwnership(address newOwner)
        public;

Managing Authorizations
=======================

The ``ZeroExGovernor`` can also manage authorizations all permissioned contracts in the Exchange and Staking systems. While the ``ZeroExGovernor`` itself is currently the only authorized address in these contracts, this feature can be used to allow new contracts to perform admin functions under different conditions in the future (such as with an on-chain token vote).

.. code-block:: solidity

    /// @dev Authorizes an address.
    /// @param target Address to authorize.
    function addAuthorizedAddress(address target)
        external;

    /// @dev Removes authorizion of an address.
    /// @param target Address to remove authorization from.
    function removeAuthorizedAddress(address target)
        external;

    /// @dev Removes authorizion of an address.
    /// @param target Address to remove authorization from.
    /// @param index Index of target in authorities array.
    function removeAuthorizedAddressAtIndex(
        address target,
        uint256 index
    )
        external;


Administering Systems
=======================

The governor owns all permissioned, trusted contracts under the 0x Protocol. Any ``onlyOwner`` function can be executed by the governor. The governor requires 2/3 signatures and is timelocked.


Timelocks
============
Function timelocks are represented in days, where one day is equivalent to 86,400 seconds.

.. csv-table::
    :header: "Contract", "Function", "Selector", "Timelock"

    AllowanceTarget, ``addAuthorizedAddress``, ``42f1181e``, 2 day
    AllowanceTarget, ``removeAuthorizedAddress``, ``70712939``, 0 days
    AllowanceTarget, ``removeAuthorizedAddressAtIndex``, ``9ad26744``, 0 days
    Governor, ``registerFunctionCall``, ``751ad560``, 2 day
    ExchangeProxy, ``extend``, ``6eb224cb``, 2 day
    ExchangeProxy, ``migrate``, ``261fe679``, 2 day
    ExchangeProxy, ``rollback``, ``9db64a40``, 0 days
    ExchangeProxy, ``setQuoteSigner``, ``<deprecation in progress>``, 2 day
    ExchangeProxy, ``setTransformerDeployer``, ``87c96419``, 2 day
    ExchangeProxy, ``transferOwnership``, ``f2fde38b``, 2 day
    StakingProxy, ``addExchangeAddress``, ``8a2e271a``, 14 days
    StakingProxy, ``removeExchangeAddress``, ``01e28d84``, 14 days
    StakingProxy, ``attachStakingContract``, ``66615d56``, 14 days
    StakingProxy, ``detachStakingContract``, ``37b006a6``, 14 days
    StakingProxy, ``setParams``, ``9c3ccc82``, 7 days
    StakingProxy, ``addAuthorizedAddress``, ``42f1181e``, 14 days
    StakingProxy, ``removeAuthorizedAddress``, ``70712939``, 14 days
    StakingProxy, ``removeAuthorizedAddressAtIndex``, ``9ad26744``, 14 days
    StakingProxy, ``transferOwnership``, ``f2fde38b``, 14 days
    ZrxVault, ``setStakingProxy``, ``6bf3f9e5``, 14 days
    ZrxVault, ``enterCatastrophicFailure``, ``c02e5a7f``, 0 days
    ZrxVault, ``setZrxProxy``, ``ca5b0218``, 14 days
    ZrxVault, ``addAuthorizedAddress``, ``42f1181e``, 14 days
    ZrxVault, ``removeAuthorizedAddress``, ``70712939``, 14 days
    ZrxVault, ``removeAuthorizedAddressAtIndex``, ``9ad26744``, 14 days
    ZrxVault, ``transferOwnership``, ``f2fde38b``, 14 days
