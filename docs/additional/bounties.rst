###############################
Bounties
###############################

We run an ongoing bug bounty for the 0x Protocol smart contracts! The program is open to anyone and
rewards up to **$100,000 for critical exploits**. The scope and disclosure instructions are below.

Rewards
-------
The severity of reported vulnerabilities will be graded according to the `CVSS <https://www.first.org/cvss/>`_ (Common Vulnerability Scoring Standard).
The following table will serve as a guideline for reward decisions:

+----------------------------+---------------------+
| **Exploit Score**          | **Reward**          |
+----------------------------+---------------------+
| Critical (CVSS 9.0 - 10.0) | $10,000 - $100,000  |
+----------------------------+---------------------+
| High (CVSS 7.0 - 8.9)      | $2,500 - $10,000    |
+----------------------------+---------------------+
| Medium (CVSS 4.0 - 6.9)    | $1,000 - $2,500     |
+----------------------------+---------------------+
| Low (CVSS 0.0 - 3.9)       | $0 - $1,000         |
+----------------------------+---------------------+

Please note that any rewards will ultimately be awarded at the discretion of ZeroEx Intl. All rewards will be paid out in ZRX. 

Areas of Interest
-----------------

+---------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Area**                  | **Examples**                                                                                                                                            |
+---------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------+
| Loss of funds             | * A user loses funds in a way that they did not explicitly authorize (e.g an account is able to gain access to an ``AssetProxy`` and drain user funds). |
|                           | * A user authorized a transaction or trade but spends more assets than normally expected (e.g an order is allowed to be over-filled).                   |
+---------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------+
| Unintended contract state | * A user is able to update the state of a contract such that it is no longer useable (e.g permanently lock a mutex).                                    |
|                           | * Any assets get unexpectedly "stuck" in a contract with regular use of the contract's public methods.                                                  |
|                           | * An action taken in the staking contracts is applied to an incorrect epoch.                                                                            |
+---------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------+
| Bypassing time locks      | * The ``ZeroExGovernor`` is allowed to bypass the timelock for transactions where it is not explicitly allowed to do so.                                |
|                           | * A user is allowed to bypass the ``ZeroExGovernor``.                                                                                                   |
+---------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------+
| Incorrect math            | * Overflows or underflow result in unexpected behavior.                                                                                                 |
|                           | * The staking reward payouts are incorrect.                                                                                                             |
+---------------------------+---------------------------------------------------------------------------------------------------------------------------------------------------------+

Scope
-----
The following contracts are in scope of the bug bounty. Please note that any bugs already reported are considered out of scope. See the `Audits <./audits.html>`_ page for 3rd party security reports.

+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------------+
| **Release**      | **Contracts**                                                                                                                                                                                                                                                                                 | **Commit Hash**                                                                                                  |
+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------------+
| Exchange V3      | * `ERC20BridgeProxy.sol <https://github.com/0xProject/0x-monorepo/blob/fb8360edfd4f42f2d2b127b95c156eb1b0daa02b/contracts/asset-proxy/contracts/src/ERC20BridgeProxy.sol>`_ (`spec <https://github.com/0xProject/0x-protocol-specification/blob/master/asset-proxy/erc20-bridge-proxy.md>`__) | `fb8360edfd <https://github.com/0xProject/0x-monorepo/tree/fb8360edfd4f42f2d2b127b95c156eb1b0daa02b/contracts>`__|
|                  | * `Exchange.sol <https://github.com/0xProject/0x-monorepo/blob/fb8360edfd4f42f2d2b127b95c156eb1b0daa02b/contracts/exchange/contracts/src/Exchange.sol>`__ (`spec <https://github.com/0xProject/0x-protocol-specification/blob/master/v3/v3-specification.md>`__)                              |                                                                                                                  |
|                  | * `ZeroExGovernor.sol <https://github.com/0xProject/0x-monorepo/blob/fb8360edfd4f42f2d2b127b95c156eb1b0daa02b/contracts/multisig/contracts/src/ZeroExGovernor.sol>`_ (`spec <https://github.com/0xProject/0x-protocol-specification/blob/master/v3/zero-ex-governor.md>`__)                   |                                                                                                                  |
|                  | * `Staking.sol <https://github.com/0xProject/0x-monorepo/blob/fb8360edfd4f42f2d2b127b95c156eb1b0daa02b/contracts/staking/contracts/src/Staking.sol>`_ (`spec <https://github.com/0xProject/0x-protocol-specification/blob/master/staking/staking-specification.md>`__)                        |                                                                                                                  |
|                  | * `StakingProxy.sol <https://github.com/0xProject/0x-monorepo/blob/fb8360edfd4f42f2d2b127b95c156eb1b0daa02b/contracts/staking/contracts/src/StakingProxy.sol>`_ (`spec <https://github.com/0xProject/0x-protocol-specification/blob/master/staking/staking-specification.md>`__)              |                                                                                                                  |
|                  | * `ZrxVault.sol <https://github.com/0xProject/0x-monorepo/blob/fb8360edfd4f42f2d2b127b95c156eb1b0daa02b/contracts/staking/contracts/src/ZrxVault.sol>`_ (`spec <https://github.com/0xProject/0x-protocol-specification/blob/master/staking/staking-specification.md>`__)                      |                                                                                                                  |
+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------------+
| Exchange V2.1    | * `src/2.0.0/protocol <https://github.com/0xProject/0x-monorepo/tree/ff70c5ecfe28eff14e1a372c5e493b8f5363e1d0/packages/contracts/src/2.0.0/protocol>`_                                                                                                                                        | `ff70c5ecfe <https://github.com/0xProject/0x-monorepo/tree/ff70c5ecfe28eff14e1a372c5e493b8f5363e1d0/contracts>`_ |
|                  | * `src/2.0.0/utils <https://github.com/0xProject/0x-monorepo/tree/ff70c5ecfe28eff14e1a372c5e493b8f5363e1d0/packages/contracts/src/2.0.0/utils>`_                                                                                                                                              |                                                                                                                  |
+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------------+
| MultiAssetProxy  | * `MultiAssetProxy.sol <https://github.com/0xProject/0x-monorepo/blob/c4d9ef9f83508154fe9db35796b6b86aeb0f2240/contracts/asset-proxy/contracts/src/MultiAssetProxy.sol>`_                                                                                                                     | `c4d9ef9f83 <https://github.com/0xProject/0x-monorepo/tree/c4d9ef9f83508154fe9db35796b6b86aeb0f2240/contracts>`_ |
+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------------+
| ERC1155Proxy     | * `ERC1155Proxy.sol <https://github.com/0xProject/0x-monorepo/blob/77484dc69eea1f4f1a8397590199f3f2489751d2/contracts/asset-proxy/contracts/src/ERC1155Proxy.sol>`_                                                                                                                           | `77484dc69e <https://github.com/0xProject/0x-monorepo/tree/77484dc69eea1f4f1a8397590199f3f2489751d2/contracts>`_ |
+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------------+
| StaticCallProxy  | * `StaticCallProxy.sol <https://github.com/0xProject/0x-monorepo/blob/54f4727adc6da95f312e3721f44857110555d24c/contracts/asset-proxy/contracts/src/StaticCallProxy.sol>`_                                                                                                                     | `54f4727adc <https://github.com/0xProject/0x-monorepo/tree/54f4727adc6da95f312e3721f44857110555d24c/contracts>`_ |
+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------------+
| ERC20BridgeProxy | * `ERC20BridgeProxy.sol <https://github.com/0xProject/0x-monorepo/blob/281658ba349a2c5088b40b503998bea5020284a6/contracts/asset-proxy/contracts/src/ERC20BridgeProxy.sol>`__                                                                                                                  | `281658ba34 <https://github.com/0xProject/0x-monorepo/tree/281658ba349a2c5088b40b503998bea5020284a6/contracts>`_ |
+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------------+
| ExchangeProxy    | * `contracts/src <https://github.com/0xProject/0x-monorepo/tree/7967a8416c76e34ff5a0a4eb80e7b33ff8c0e297/contracts/zero-ex>`__                                                                                                                                                                | `7967a8416c <https://github.com/0xProject/0x-monorepo/tree/7967a8416c76e34ff5a0a4eb80e7b33ff8c0e297/contracts>`_ |
+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+------------------------------------------------------------------------------------------------------------------+

Disclosures
-----------
Please e-mail all submissions to security@0x.org with the subject "BUG BOUNTY". Your submission 
should include any steps required to reproduce or exploit the vulnerability. Please allow time for 
the vulnerability to be fixed before discussing any findings publicly. After receiving a submission, 
we will contact you with expected timelines for a fix to be implemented.