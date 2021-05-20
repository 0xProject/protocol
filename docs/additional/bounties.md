---
title: Bounties
---

We run an ongoing bug bounty for the 0x Protocol smart contracts! The
program is open to anyone and rewards up to **\$100,000 for critical
exploits**. The scope and disclosure instructions are below.

# Rewards

The severity of reported vulnerabilities will be graded according to the
[CVSS](https://www.first.org/cvss/) (Common Vulnerability Scoring
Standard). The following table will serve as a guideline for reward
decisions:

  ---------------------------- ---------------------
  **Exploit Score**            **Reward**

  Critical (CVSS 9.0 - 10.0)   \$10,000 - \$100,000

  High (CVSS 7.0 - 8.9)        \$2,500 - \$10,000

  Medium (CVSS 4.0 - 6.9)      \$1,000 - \$2,500

  Low (CVSS 0.0 - 3.9)         \$0 - \$1,000
  ---------------------------- ---------------------

Please note that any rewards will ultimately be awarded at the
discretion of ZeroEx Intl. All rewards will be paid out in ZRX.

# Areas of Interest

+----------+-----------------------------------------------------------+
| **Area** | **Examples**                                              |
+----------+-----------------------------------------------------------+
| Loss of  | -   A user loses funds in a way that they did not         |
| funds    |     explicitly authorize (e.g an account is able to gain  |
|          |     access to an `AssetProxy` and drain user funds).      |
|          | -   A user authorized a transaction or trade but spends   |
|          |     more assets than normally expected (e.g an order is   |
|          |     allowed to be over-filled).                           |
+----------+-----------------------------------------------------------+
| Un       | -   A user is able to update the state of a contract such |
| intended |     that it is no longer useable (e.g permanently lock a  |
| contract |     mutex).                                               |
| state    | -   Any assets get unexpectedly \"stuck\" in a contract   |
|          |     with regular use of the contract\'s public methods.   |
|          | -   An action taken in the staking contracts is applied   |
|          |     to an incorrect epoch.                                |
+----------+-----------------------------------------------------------+
| B        | -   The `ZeroExGovernor` is allowed to bypass the         |
| ypassing |     timelock for transactions where it is not explicitly  |
| time     |     allowed to do so.                                     |
| locks    | -   A user is allowed to bypass the `ZeroExGovernor`.     |
+----------+-----------------------------------------------------------+
| I        | -   Overflows or underflow result in unexpected behavior. |
| ncorrect | -   The staking reward payouts are incorrect.             |
| math     |                                                           |
+----------+-----------------------------------------------------------+

# Scope

The following contracts are in scope of the bug bounty. Please note that
any bugs already reported are considered out of scope. See the
[Audits](./audits.html) page for 3rd party security reports.

+---+---------------------------------------------+--------------------+
| * | **Contracts**                               | **Commit Hash**    |
| * |                                             |                    |
| R |                                             |                    |
| e |                                             |                    |
| l |                                             |                    |
| e |                                             |                    |
| a |                                             |                    |
| s |                                             |                    |
| e |                                             |                    |
| * |                                             |                    |
| * |                                             |                    |
+---+---------------------------------------------+--------------------+
| E | -   Documentation at                        | [72                |
| x |     <ht                                     | a74e7c66](https:// |
| c | tps://0xprotocol.readthedocs.io/en/latest/> | github.com/0xProje |
| h | -   [ZeroEx.sol                             | ct/protocol/tree/7 |
| a | ](https://github.com/0xProject/protocol/blo | 2a74e7c66e27da02dd |
| n | b/72a74e7c66e27da02dd9f4ce604ad057c740c304/ | 9f4ce604ad057c740c |
| g | contracts/zero-ex/contracts/src/ZeroEx.sol) | 304/contracts/zero |
| e | -   [ZeroExOptimized.sol](https:/           | -ex/contracts/src) |
| V | /github.com/0xProject/protocol/blob/72a74e7 |                    |
| 4 | c66e27da02dd9f4ce604ad057c740c304/contracts |                    |
|   | /zero-ex/contracts/src/ZeroExOptimized.sol) |                    |
|   | -   [external/\*.s                          |                    |
|   | ol](https://github.com/0xProject/protocol/t |                    |
|   | ree/72a74e7c66e27da02dd9f4ce604ad057c740c30 |                    |
|   | 4/contracts/zero-ex/contracts/src/external) |                    |
|   | -   [features/\*\*.s                        |                    |
|   | ol](https://github.com/0xProject/protocol/t |                    |
|   | ree/72a74e7c66e27da02dd9f4ce604ad057c740c30 |                    |
|   | 4/contracts/zero-ex/contracts/src/features) |                    |
|   | -   [fixins/\*                              |                    |
|   | .sol](https://github.com/0xProject/protocol |                    |
|   | /tree/72a74e7c66e27da02dd9f4ce604ad057c740c |                    |
|   | 304/contracts/zero-ex/contracts/src/fixins) |                    |
|   | -   [migrations/\*.sol                      |                    |
|   | ](https://github.com/0xProject/protocol/tre |                    |
|   | e/72a74e7c66e27da02dd9f4ce604ad057c740c304/ |                    |
|   | contracts/zero-ex/contracts/src/migrations) |                    |
|   | -   [storage/\*.                            |                    |
|   | sol](https://github.com/0xProject/protocol/ |                    |
|   | tree/72a74e7c66e27da02dd9f4ce604ad057c740c3 |                    |
|   | 04/contracts/zero-ex/contracts/src/storage) |                    |
+---+---------------------------------------------+--------------------+
| E | -   [ERC20BridgeProxy.sol](https://github.  | [f                 |
| x | com/0xProject/0x-monorepo/blob/fb8360edfd4f | b8360edfd](https:/ |
| c | 42f2d2b127b95c156eb1b0daa02b/contracts/asse | /github.com/0xProj |
| h | t-proxy/contracts/src/ERC20BridgeProxy.sol) | ect/0x-monorepo/tr |
| a |     ([spec](https://github.c                | ee/fb8360edfd4f42f |
| n | om/0xProject/0x-protocol-specification/blob | 2d2b127b95c156eb1b |
| g | /master/asset-proxy/erc20-bridge-proxy.md)) | 0daa02b/contracts) |
| e | -   [Exchange.sol](http                     |                    |
| V | s://github.com/0xProject/0x-monorepo/blob/f |                    |
| 3 | b8360edfd4f42f2d2b127b95c156eb1b0daa02b/con |                    |
|   | tracts/exchange/contracts/src/Exchange.sol) |                    |
|   |     ([spec](https                           |                    |
|   | ://github.com/0xProject/0x-protocol-specifi |                    |
|   | cation/blob/master/v3/v3-specification.md)) |                    |
|   | -   [ZeroExGovernor.sol](https://gi         |                    |
|   | thub.com/0xProject/0x-monorepo/blob/fb8360e |                    |
|   | dfd4f42f2d2b127b95c156eb1b0daa02b/contracts |                    |
|   | /multisig/contracts/src/ZeroExGovernor.sol) |                    |
|   |     ([spec](https                           |                    |
|   | ://github.com/0xProject/0x-protocol-specifi |                    |
|   | cation/blob/master/v3/zero-ex-governor.md)) |                    |
|   | -   [Staking.sol](ht                        |                    |
|   | tps://github.com/0xProject/0x-monorepo/blob |                    |
|   | /fb8360edfd4f42f2d2b127b95c156eb1b0daa02b/c |                    |
|   | ontracts/staking/contracts/src/Staking.sol) |                    |
|   |     ([spec](https://github.                 |                    |
|   | com/0xProject/0x-protocol-specification/blo |                    |
|   | b/master/staking/staking-specification.md)) |                    |
|   | -   [StakingProxy.sol](https:/              |                    |
|   | /github.com/0xProject/0x-monorepo/blob/fb83 |                    |
|   | 60edfd4f42f2d2b127b95c156eb1b0daa02b/contra |                    |
|   | cts/staking/contracts/src/StakingProxy.sol) |                    |
|   |     ([spec](https://github.                 |                    |
|   | com/0xProject/0x-protocol-specification/blo |                    |
|   | b/master/staking/staking-specification.md)) |                    |
|   | -   [ZrxVault.sol](htt                      |                    |
|   | ps://github.com/0xProject/0x-monorepo/blob/ |                    |
|   | fb8360edfd4f42f2d2b127b95c156eb1b0daa02b/co |                    |
|   | ntracts/staking/contracts/src/ZrxVault.sol) |                    |
|   |     ([spec](https://github.                 |                    |
|   | com/0xProject/0x-protocol-specification/blo |                    |
|   | b/master/staking/staking-specification.md)) |                    |
+---+---------------------------------------------+--------------------+
| E | -   [src/2.0.0/protoc                       | [f                 |
| x | ol](https://github.com/0xProject/0x-monorep | f70c5ecfe](https:/ |
| c | o/tree/ff70c5ecfe28eff14e1a372c5e493b8f5363 | /github.com/0xProj |
| h | e1d0/packages/contracts/src/2.0.0/protocol) | ect/0x-monorepo/tr |
| a | -   [src/2.0.0/                             | ee/ff70c5ecfe28eff |
| n | utils](https://github.com/0xProject/0x-mono | 14e1a372c5e493b8f5 |
| g | repo/tree/ff70c5ecfe28eff14e1a372c5e493b8f5 | 363e1d0/contracts) |
| e | 363e1d0/packages/contracts/src/2.0.0/utils) |                    |
| V |                                             |                    |
| 2 |                                             |                    |
| . |                                             |                    |
| 1 |                                             |                    |
+---+---------------------------------------------+--------------------+
| M | -   [MultiAssetProxy.sol](https://github    | [c                 |
| u | .com/0xProject/0x-monorepo/blob/c4d9ef9f835 | 4d9ef9f83](https:/ |
| l | 08154fe9db35796b6b86aeb0f2240/contracts/ass | /github.com/0xProj |
| t | et-proxy/contracts/src/MultiAssetProxy.sol) | ect/0x-monorepo/tr |
| i |                                             | ee/c4d9ef9f8350815 |
| A |                                             | 4fe9db35796b6b86ae |
| s |                                             | b0f2240/contracts) |
| s |                                             |                    |
| e |                                             |                    |
| t |                                             |                    |
| P |                                             |                    |
| r |                                             |                    |
| o |                                             |                    |
| x |                                             |                    |
| y |                                             |                    |
+---+---------------------------------------------+--------------------+
| E | -   [ERC1155Proxy.sol](https://git          | [7                 |
| R | hub.com/0xProject/0x-monorepo/blob/77484dc6 | 7484dc69e](https:/ |
| C | 9eea1f4f1a8397590199f3f2489751d2/contracts/ | /github.com/0xProj |
| 1 | asset-proxy/contracts/src/ERC1155Proxy.sol) | ect/0x-monorepo/tr |
| 1 |                                             | ee/77484dc69eea1f4 |
| 5 |                                             | f1a8397590199f3f24 |
| 5 |                                             | 89751d2/contracts) |
| P |                                             |                    |
| r |                                             |                    |
| o |                                             |                    |
| x |                                             |                    |
| y |                                             |                    |
+---+---------------------------------------------+--------------------+
| S | -   [StaticCallProxy.sol](https://github    | [5                 |
| t | .com/0xProject/0x-monorepo/blob/54f4727adc6 | 4f4727adc](https:/ |
| a | da95f312e3721f44857110555d24c/contracts/ass | /github.com/0xProj |
| t | et-proxy/contracts/src/StaticCallProxy.sol) | ect/0x-monorepo/tr |
| i |                                             | ee/54f4727adc6da95 |
| c |                                             | f312e3721f44857110 |
| C |                                             | 555d24c/contracts) |
| a |                                             |                    |
| l |                                             |                    |
| l |                                             |                    |
| P |                                             |                    |
| r |                                             |                    |
| o |                                             |                    |
| x |                                             |                    |
| y |                                             |                    |
+---+---------------------------------------------+--------------------+
| E | -   [ERC20BridgeProxy.sol](https://github.  | [2                 |
| R | com/0xProject/0x-monorepo/blob/281658ba349a | 81658ba34](https:/ |
| C | 2c5088b40b503998bea5020284a6/contracts/asse | /github.com/0xProj |
| 2 | t-proxy/contracts/src/ERC20BridgeProxy.sol) | ect/0x-monorepo/tr |
| 0 |                                             | ee/281658ba349a2c5 |
| B |                                             | 088b40b503998bea50 |
| r |                                             | 20284a6/contracts) |
| i |                                             |                    |
| d |                                             |                    |
| g |                                             |                    |
| e |                                             |                    |
| P |                                             |                    |
| r |                                             |                    |
| o |                                             |                    |
| x |                                             |                    |
| y |                                             |                    |
+---+---------------------------------------------+--------------------+
| E | -   [contracts/src](https://github.com/     | [7                 |
| x | 0xProject/0x-monorepo/tree/7967a8416c76e34f | 967a8416c](https:/ |
| c | f5a0a4eb80e7b33ff8c0e297/contracts/zero-ex) | /github.com/0xProj |
| h |                                             | ect/0x-monorepo/tr |
| a |                                             | ee/7967a8416c76e34 |
| n |                                             | ff5a0a4eb80e7b33ff |
| g |                                             | 8c0e297/contracts) |
| e |                                             |                    |
| P |                                             |                    |
| r |                                             |                    |
| o |                                             |                    |
| x |                                             |                    |
| y |                                             |                    |
+---+---------------------------------------------+--------------------+

# Disclosures

Please e-mail all submissions to <security@0x.org> with the subject
\"BUG BOUNTY\". Your submission should include any steps required to
reproduce or exploit the vulnerability. Please allow time for the
vulnerability to be fixed before discussing any findings publicly. After
receiving a submission, we will contact you with expected timelines for
a fix to be implemented.
