No files changed, compilation skipped

Running 1 test for contracts/test/foundry/Local0xSwap.sol:BasicSwapTest
[32m[PASS][0m testTransformERC20() (gas: 124963)
Logs:
  --- Deployed ZeroEx ---
  ZeroEx: 0xdef1c0ded9bec7f1a1670819833240f027b25eff
  TransformerDeployer: 0x8add0dbf7e58c9a8ea5981da48930ecceb9cfba7
  FeeCollectorController: 0x5d5b57e5c00e9d4f00b548d361f06d1820cadfa7
  Staking: 0x0000000000000000000000000000000000000000
  ----- Features -----
  NativeOrdersFeature: 0x9e33f993e9665cd34ed28dbd377ab3342b76c1bc
  BatchFillNativeOrdersFeature: 0xcdbc2742eae6deea8e7b94d51b3745c76604891e
  OtcOrdersFeature: 0x559323bc7d88038241a86ee69274202bb5435c06
  UniswapFeature: 0x264c5c0fff5c71606a2cdaf1b52c16c8553fb1ed
  FundRecoveryFeature: 0x0101a63df23510733d09dcdfbe658a971076ce5f
  MetaTransactionsFeature: 0xca13b5b304faadf261eb1336ef14f1e1a35ef89a
  ERC1155OrdersFeature: 0x15ca93b00cd2641495675afcbde59901eb010d38
  ERC721OrdersFeature: 0xf2bc865f9aae2870cba901a9945dd6d400aef293
  TransformERC20Feature: 0xf77a5ac213cc74753859bcd20e8d4fbf21ddfeec
  MultiplexFeature: 0x60b1842fd65bc49ce681ba40351cc465411a8b69
  ----- Transformers -----
  FillQuoteTransformer: 0xeb3fcbb6a6f187ca7d4732b8e3794adf6b65ae29
  WethTransformer: 0xe42066258c54d47b579b9cd5abde312f62d1ff16
  AffiliateFeeTransformer: 0xb343903486fb35f353f3a437d91accc9d7064202
  PayTakerTransformer: 0xcfb900206fdf6661c37032ea3067b86d236ada6e
  ----- Other -----
  WETH: 0x037fc82298142374d974839236d2e2df6b5bdd8f
  -----Preparing ETH->WETH transformation through TransformERC20()-----
     --Building Up Transformations--
      Finding TransformerDeployer nonce @: 0x8add0dbf7e58c9a8ea5981da48930ecceb9cfba7
         Deployer nonce: 1
     ---Calling TransformERC20()---
         Successful Transformation Complete
             ETH BALANCE BEFORE:: 10000000000000000000
             ETH BALANCE AFTER:: 9000000000000000000
             WETH BALANCE BEFORE:: 0
             WETH BALANCE AFTER:: 1000000000000000000

Traces:
  [124963] [32mBasicSwapTest[0m::[32mtestTransformERC20[0m() [33m[0m
    ├─ emit [36mlog_string[0m(: -----Preparing ETH->WETH transformation through TransformERC20()-----)
    ├─ emit [36mlog_string[0m(:    --Building Up Transformations--)
    ├─ emit [36mlog_named_address[0m(key:     Finding TransformerDeployer nonce @, val: TransformerDeployer: [0x8add0dBF7e58c9a8Ea5981dA48930EcCeb9cfba7])
    ├─ emit [36mlog_named_uint[0m(key:        Deployer nonce, val: 1)
    ├─ emit [36mlog_string[0m(:    ---Calling TransformERC20()---)
    ├─ [2457] [32mWETH9V06[0m::[32mbalanceOf[0m(BasicSwapTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0
    ├─ [75110] [32mZeroEx[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, WETH9V06: [0x037FC82298142374d974839236D2e2dF6B5BdD8F], 1000000000000000000, 1000000000000000000, [(1, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[0m
    │   ├─ [70482] [32mTransformERC20Feature[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, WETH9V06: [0x037FC82298142374d974839236D2e2dF6B5BdD8F], 1000000000000000000, 1000000000000000000, [(1, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[delegatecall][0m
    │   │   ├─ [457] [32mWETH9V06[0m::[32mbalanceOf[0m(BasicSwapTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0
    │   │   ├─ [55] [32mFlashWallet[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [35786] [32mFlashWallet[0m::[32mexecuteDelegateCall[0m(WethTransformer: [0xe42066258C54D47B579B9cD5aBDE312F62d1fF16], 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [32019] [32mWethTransformer[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [23802] [32mWETH9V06[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ emit [36mDeposit[0m(_owner: FlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   └─ [32m← [0m0x13c9929e
    │   │   │   └─ [32m← [0m0x13c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [457] [32mWETH9V06[0m::[32mbalanceOf[0m(FlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m1000000000000000000
    │   │   ├─ [19354] [32mFlashWallet[0m::[32mexecuteCall[0m(WETH9V06: [0x037FC82298142374d974839236D2e2dF6B5BdD8F], 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e840000000000000000000000000000000000000000000000000de0b6b3a7640000, 0) [33m[0m
    │   │   │   ├─ [18321] [32mWETH9V06[0m::[32mtransfer[0m(BasicSwapTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   │   │   │   ├─ emit [36mTransfer[0m(_from: FlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _to: BasicSwapTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 1000000000000000000)
    │   │   │   │   └─ [32m← [0mtrue
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [457] [32mWETH9V06[0m::[32mbalanceOf[0m(BasicSwapTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m1000000000000000000
    │   │   ├─ emit [36mTransformedERC20[0m(taker: BasicSwapTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: WETH9V06: [0x037FC82298142374d974839236D2e2dF6B5BdD8F], inputTokenAmount: 1000000000000000000, outputTokenAmount: 1000000000000000000)
    │   │   └─ [32m← [0m1000000000000000000
    │   └─ [32m← [0m1000000000000000000
    ├─ [457] [32mWETH9V06[0m::[32mbalanceOf[0m(BasicSwapTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m1000000000000000000
    ├─ emit [36mlog_string[0m(:        Successful Transformation Complete)
    ├─ emit [36mlog_named_uint[0m(key:            ETH BALANCE BEFORE:, val: 10000000000000000000)
    ├─ emit [36mlog_named_uint[0m(key:            ETH BALANCE AFTER:, val: 9000000000000000000)
    ├─ emit [36mlog_named_uint[0m(key:            WETH BALANCE BEFORE:, val: 0)
    ├─ [457] [32mWETH9V06[0m::[32mbalanceOf[0m(BasicSwapTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m1000000000000000000
    ├─ emit [36mlog_named_uint[0m(key:            WETH BALANCE AFTER:, val: 1000000000000000000)
    └─ [32m← [0m()

Test result: [32mok[0m. 1 passed; 0 failed; finished in 12.54ms

Running 1 test for contracts/test/foundry/WethTransformerTests.sol:transformERC20Tests
[32m[PASS][0m testTransformERC20Forked() (gas: 2232507)
Logs:
  TransformERC20Tests
    Selecting Fork On: mainnet
  -----Preparing ETH->WETH transformation through TransformERC20()-----
     --Building Up Transformations--
      Finding TransformerDeployer nonce @: 0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb
         Deployer nonce: 6
     ---Calling TransformERC20()---
          NativeAsset balance before: 10000000000000000000
          ERC-20 balance before: 0
          NativeAsset balance after: 1000000000000000000
          ERC-20 balance after: 1000000000000000000
    Selecting Fork On: bsc
  -----Preparing ETH->WETH transformation through TransformERC20()-----
     --Building Up Transformations--
      Finding TransformerDeployer nonce @: 0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568
         Deployer nonce: 4
     ---Calling TransformERC20()---
          NativeAsset balance before: 10000000000000000000
          ERC-20 balance before: 0
          NativeAsset balance after: 1000000000000000000
          ERC-20 balance after: 1000000000000000000
    Selecting Fork On: polygon
  -----Preparing ETH->WETH transformation through TransformERC20()-----
     --Building Up Transformations--
      Finding TransformerDeployer nonce @: 0xe6d9207df11c55bce2f7a189ae95e3222d5484d3
         Deployer nonce: 4
     ---Calling TransformERC20()---
          NativeAsset balance before: 10000000000000000000
          ERC-20 balance before: 0
          NativeAsset balance after: 1000000000000000000
          ERC-20 balance after: 1000000000000000000
    Selecting Fork On: avalanche
  -----Preparing ETH->WETH transformation through TransformERC20()-----
     --Building Up Transformations--
      Finding TransformerDeployer nonce @: 0xa60b57833dce6260f4f2411c811755dd980bc0a7
         Deployer nonce: 4
     ---Calling TransformERC20()---
          NativeAsset balance before: 10000000000000000000
          ERC-20 balance before: 0
          NativeAsset balance after: 1000000000000000000
          ERC-20 balance after: 1000000000000000000
    Selecting Fork On: fantom
  -----Preparing ETH->WETH transformation through TransformERC20()-----
     --Building Up Transformations--
      Finding TransformerDeployer nonce @: 0x47f01db18a38261e4cb153bae6db7d3743acb33c
         Deployer nonce: 4
     ---Calling TransformERC20()---
          NativeAsset balance before: 10000000000000000000
          ERC-20 balance before: 0
          NativeAsset balance after: 1000000000000000000
          ERC-20 balance after: 1000000000000000000
    Selecting Fork On: optimism
  -----Preparing ETH->WETH transformation through TransformERC20()-----
     --Building Up Transformations--
      Finding TransformerDeployer nonce @: 0x3a539ed6bd42de8fbaf3899fb490c792e153d647
         Deployer nonce: 4
     ---Calling TransformERC20()---
          NativeAsset balance before: 10000000000000000000
          ERC-20 balance before: 0
          NativeAsset balance after: 1000000000000000000
          ERC-20 balance after: 1000000000000000000
    Selecting Fork On: arbitrum
  -----Preparing ETH->WETH transformation through TransformERC20()-----
     --Building Up Transformations--
      Finding TransformerDeployer nonce @: 0x29f80c1f685e19ae1807063eda432f431ac623d0
         Deployer nonce: 4
     ---Calling TransformERC20()---
          NativeAsset balance before: 10000000000000000000
          ERC-20 balance before: 0
          NativeAsset balance after: 1000000000000000000
          ERC-20 balance after: 1000000000000000000

Traces:
  [2232507] [32mtransformERC20Tests[0m::[32mtestTransformERC20Forked[0m() [33m[0m
    ├─ emit [36mlog_string[0m(: TransformERC20Tests)
    ├─ [0] [34mVM[0m::[34mselectFork[0m(0) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: mainnet)
    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000da6d9fc5998f550a094585cf9171f0e8ee3ac59f0000000000000000000000008ed95d1746bf1e4dab58d8ed4724f1ef95b20db0000000000000000000000000d8c38704c9937ea3312de29f824b4ad3450a5e61000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18000000000000000000000000618f9c67ce7bf1a50afa1e7e0238422601b0ff6e000000000000000000000000407b4128e9ecad8769b2332312a9f655cb9f5f3a00000000000000000000000039dce47a67ad34344eab877eae3ef1fa2a1d50bb000000000000000000000000d75a9019a2a1782ea670e4f4a55f04b43514ed530000000000000000000000004638a7ebe75b911b995d0ec73a81e4f85f41f24e000000000000000000000000a9416ce1dbde8d331210c07b5c253d94ee4cc3fd0000000000000000000000002a17c35ff147b32f13f19f2e311446eeb02503f3000000000000000000000000a26e80e7dea86279c6d778d702cc413e6cffa777000000000000000000000000b2bc06a4efb20fc6553a69dbfa49b7be938034a70000000000000000000000007d3455421bbc5ed534a83c88fd80387dc8271392000000000000000000000000e41d2489571d322189246dafa5ebde1f4699f4980000000000000000000000000bb1810061c2f5b2088054ee184e6c79e1591101000000000000000000000000ba7f8b5fb1b19c1211c5d49550fcd149177a5eaf
    ├─ [0] [34mVM[0m::[34mdeal[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 10000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_string[0m(: -----Preparing ETH->WETH transformation through TransformERC20()-----)
    ├─ emit [36mlog_string[0m(:    --Building Up Transformations--)
    ├─ emit [36mlog_named_address[0m(key:     Finding TransformerDeployer nonce @, val: 0x39dCe47a67aD34344EAB877eaE3Ef1FA2a1d50Bb)
    ├─ emit [36mlog_named_uint[0m(key:        Deployer nonce, val: 6)
    ├─ emit [36mlog_string[0m(:    ---Calling TransformERC20()---)
    ├─ [2534] [32m0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [75682] [32m0xDef1C0ded9bec7F1a1670819833240f027b25EfF[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 1000000000000000000, 1000000000000000000, [(6, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[0m
    │   ├─ [71049] [32m0x44A6999Ec971cfCA458AFf25A808F272f6d492A2[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 1000000000000000000, 1000000000000000000, [(6, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[delegatecall][0m
    │   │   ├─ [534] [32m0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [55] [32m0x22F9dCF4647084d6C31b2765F6910cd85C178C18[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [35958] [32m0x22F9dCF4647084d6C31b2765F6910cd85C178C18[0m::[32mexecuteDelegateCall[0m(0xb2bc06a4EfB20FC6553a69Dbfa49B7bE938034A7, 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [32191] [32m0xb2bc06a4EfB20FC6553a69Dbfa49B7bE938034A7[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [23974] [32m0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ emit [36mDeposit[0m(_owner: 0x22F9dCF4647084d6C31b2765F6910cd85C178C18, _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   └─ [32m← [0m0x13c9929e00000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [534] [32m0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2[0m::[32mbalanceOf[0m(0x22F9dCF4647084d6C31b2765F6910cd85C178C18) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ [19563] [32m0x22F9dCF4647084d6C31b2765F6910cd85C178C18[0m::[32mexecuteCall[0m(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e840000000000000000000000000000000000000000000000000de0b6b3a7640000, 0) [33m[0m
    │   │   │   ├─ [18530] [32m0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2[0m::[32mtransfer[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   │   │   │   ├─ emit [36mTransfer[0m(_from: 0x22F9dCF4647084d6C31b2765F6910cd85C178C18, _to: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 1000000000000000000)
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [534] [32m0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ emit [36mTransformedERC20[0m(taker: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, inputTokenAmount: 1000000000000000000, outputTokenAmount: 1000000000000000000)
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance before, val: 10000000000000000000)
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance before, val: 0)
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance after, val: 1000000000000000000)
    ├─ [534] [32m0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance after, val: 1000000000000000000)
    ├─ [0] [34mVM[0m::[34mselectFork[0m(1) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: bsc)
    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .56) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000001be34ab9b2acb5c4ddd89454bdce637967e6523000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000db6f1920a889355780af7570773609bd8cb1f498000000000000000000000000ccc9769c1a58766e79423a34b2cc5052d65c1983000000000000000000000000de7b2747624a647600fdb349184d0448ab9549290000000000000000000000008224aa8fe5c9f07d5a59c735386ff6cc6aaeb568000000000000000000000000bd7fd6e116fc8589bb658fba3a2cc6273050bcf20000000000000000000000004f5e8ca2cadecd4a467ae441e4b03de4278a45740000000000000000000000007f5c79ad1788573b1145f4651a248523c54f5d1f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ac3d95668c092e895cd83a9cbafe9c7d9906471f0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mdeal[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 10000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_string[0m(: -----Preparing ETH->WETH transformation through TransformERC20()-----)
    ├─ emit [36mlog_string[0m(:    --Building Up Transformations--)
    ├─ emit [36mlog_named_address[0m(key:     Finding TransformerDeployer nonce @, val: 0x8224aa8FE5c9f07d5a59c735386fF6CC6AAEB568)
    ├─ emit [36mlog_named_uint[0m(key:        Deployer nonce, val: 4)
    ├─ emit [36mlog_string[0m(:    ---Calling TransformERC20()---)
    ├─ [2534] [32m0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [75677] [32m0xDef1C0ded9bec7F1a1670819833240f027b25EfF[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c, 1000000000000000000, 1000000000000000000, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[0m
    │   ├─ [71049] [32m0xfcEB29377a6e0A86E9fa648016b459AB8Fbfcf5A[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c, 1000000000000000000, 1000000000000000000, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[delegatecall][0m
    │   │   ├─ [534] [32m0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [55] [32m0xdB6f1920A889355780aF7570773609Bd8Cb1f498[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [35958] [32m0xdB6f1920A889355780aF7570773609Bd8Cb1f498[0m::[32mexecuteDelegateCall[0m(0xAc3D95668c092e895cd83A9CBAfE9C7D9906471f, 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [32191] [32m0xAc3D95668c092e895cd83A9CBAfE9C7D9906471f[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [23974] [32m0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ emit [36mDeposit[0m(_owner: 0xdB6f1920A889355780aF7570773609Bd8Cb1f498, _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   └─ [32m← [0m0x13c9929e00000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [534] [32m0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c[0m::[32mbalanceOf[0m(0xdB6f1920A889355780aF7570773609Bd8Cb1f498) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ [19563] [32m0xdB6f1920A889355780aF7570773609Bd8Cb1f498[0m::[32mexecuteCall[0m(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c, 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e840000000000000000000000000000000000000000000000000de0b6b3a7640000, 0) [33m[0m
    │   │   │   ├─ [18530] [32m0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c[0m::[32mtransfer[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   │   │   │   ├─ emit [36mTransfer[0m(_from: 0xdB6f1920A889355780aF7570773609Bd8Cb1f498, _to: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 1000000000000000000)
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [534] [32m0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ emit [36mTransformedERC20[0m(taker: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c, inputTokenAmount: 1000000000000000000, outputTokenAmount: 1000000000000000000)
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance before, val: 10000000000000000000)
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance before, val: 0)
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance after, val: 1000000000000000000)
    ├─ [534] [32m0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance after, val: 1000000000000000000)
    ├─ [0] [34mVM[0m::[34mselectFork[0m(2) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: polygon)
    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .137) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000bed27284b42e5684e987169cf1da09c5d6c49fa8000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000db6f1920a889355780af7570773609bd8cb1f4980000000000000000000000004d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae60000000000000000000000004dd97080adf36103bd3db822f9d3c0e44890fd69000000000000000000000000e6d9207df11c55bce2f7a189ae95e3222d5484d300000000000000000000000001c082e47c8dc6dedd01e3fcb07bfd3eb72e044d0000000000000000000000005ba7b9be86cda01cfbf56e0fb97184783be9dda10000000000000000000000004cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e309d011cc6f189a3e8dcba85922715a019fed380000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mdeal[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 10000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_string[0m(: -----Preparing ETH->WETH transformation through TransformERC20()-----)
    ├─ emit [36mlog_string[0m(:    --Building Up Transformations--)
    ├─ emit [36mlog_named_address[0m(key:     Finding TransformerDeployer nonce @, val: 0xe6d9207df11C55Bce2F7a189Ae95e3222d5484D3)
    ├─ emit [36mlog_named_uint[0m(key:        Deployer nonce, val: 4)
    ├─ emit [36mlog_string[0m(:    ---Calling TransformERC20()---)
    ├─ [2564] [32m0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [75778] [32m0xDef1C0ded9bec7F1a1670819833240f027b25EfF[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270, 1000000000000000000, 1000000000000000000, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[0m
    │   ├─ [71150] [32m0x33AA21AA1Ad5d6cAe3c713dE407B97f4b47321A3[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270, 1000000000000000000, 1000000000000000000, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[delegatecall][0m
    │   │   ├─ [564] [32m0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [55] [32m0xdB6f1920A889355780aF7570773609Bd8Cb1f498[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [35961] [32m0xdB6f1920A889355780aF7570773609Bd8Cb1f498[0m::[32mexecuteDelegateCall[0m(0xE309D011cC6F189A3e8DCBa85922715A019FED38, 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [32194] [32m0xE309D011cC6F189A3e8DCBa85922715A019FED38[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [23977] [32m0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ emit [36mDeposit[0m(_owner: 0xdB6f1920A889355780aF7570773609Bd8Cb1f498, _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   └─ [32m← [0m0x13c9929e00000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [564] [32m0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270[0m::[32mbalanceOf[0m(0xdB6f1920A889355780aF7570773609Bd8Cb1f498) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ [19589] [32m0xdB6f1920A889355780aF7570773609Bd8Cb1f498[0m::[32mexecuteCall[0m(0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270, 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e840000000000000000000000000000000000000000000000000de0b6b3a7640000, 0) [33m[0m
    │   │   │   ├─ [18556] [32m0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270[0m::[32mtransfer[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   │   │   │   ├─ emit [36mTransfer[0m(_from: 0xdB6f1920A889355780aF7570773609Bd8Cb1f498, _to: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 1000000000000000000)
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [564] [32m0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ emit [36mTransformedERC20[0m(taker: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270, inputTokenAmount: 1000000000000000000, outputTokenAmount: 1000000000000000000)
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance before, val: 10000000000000000000)
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance before, val: 0)
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance after, val: 1000000000000000000)
    ├─ [564] [32m0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance after, val: 1000000000000000000)
    ├─ [0] [34mVM[0m::[34mselectFork[0m(3) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: avalanche)
    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .43114) [33m[0m
    │   └─ [34m← [0m0x00000000000000000000000034617b855411e52fbc05899435f44cbd0503022c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b31f66aa3c1e785363f0875a1b74e27b85fd66c7000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000db6f1920a889355780af7570773609bd8cb1f498000000000000000000000000ca7bab1b2d1ec7d81710b7f9e2ab4e67889305880000000000000000000000008953c63d0858d286cc407cd6f8e26b9cbd02a511000000000000000000000000a60b57833dce6260f4f2411c811755dd980bc0a7000000000000000000000000cee9118bc14e1fe740c54c754b901629b322ee4f000000000000000000000000898c6fde239d646c73f0a57e3570b6f86a3d62a3000000000000000000000000470ba89da18a6db6e8a0567b3c9214b960861857000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000009b8b52391071d71cd4ad1e61d7f273268fa34c6c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mdeal[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 10000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_string[0m(: -----Preparing ETH->WETH transformation through TransformERC20()-----)
    ├─ emit [36mlog_string[0m(:    --Building Up Transformations--)
    ├─ emit [36mlog_named_address[0m(key:     Finding TransformerDeployer nonce @, val: 0xA60B57833DCE6260F4F2411c811755Dd980Bc0a7)
    ├─ emit [36mlog_named_uint[0m(key:        Deployer nonce, val: 4)
    ├─ emit [36mlog_string[0m(:    ---Calling TransformERC20()---)
    ├─ [2491] [32m0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [75460] [32m0xDef1C0ded9bec7F1a1670819833240f027b25EfF[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7, 1000000000000000000, 1000000000000000000, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[0m
    │   ├─ [70832] [32m0x9866C45224667061F8C9E66Db38D9316A8d68951[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7, 1000000000000000000, 1000000000000000000, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[delegatecall][0m
    │   │   ├─ [491] [32m0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [55] [32m0xdB6f1920A889355780aF7570773609Bd8Cb1f498[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [35862] [32m0xdB6f1920A889355780aF7570773609Bd8Cb1f498[0m::[32mexecuteDelegateCall[0m(0x9b8b52391071D71Cd4aD1e61d7f273268fA34c6c, 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [32095] [32m0x9b8b52391071D71Cd4aD1e61d7f273268fA34c6c[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [23878] [32m0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ emit [36mDeposit[0m(_owner: 0xdB6f1920A889355780aF7570773609Bd8Cb1f498, _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   └─ [32m← [0m0x13c9929e00000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [491] [32m0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7[0m::[32mbalanceOf[0m(0xdB6f1920A889355780aF7570773609Bd8Cb1f498) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ [19526] [32m0xdB6f1920A889355780aF7570773609Bd8Cb1f498[0m::[32mexecuteCall[0m(0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7, 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e840000000000000000000000000000000000000000000000000de0b6b3a7640000, 0) [33m[0m
    │   │   │   ├─ [18493] [32m0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7[0m::[32mtransfer[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   │   │   │   ├─ emit [36mTransfer[0m(_from: 0xdB6f1920A889355780aF7570773609Bd8Cb1f498, _to: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 1000000000000000000)
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [491] [32m0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ emit [36mTransformedERC20[0m(taker: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7, inputTokenAmount: 1000000000000000000, outputTokenAmount: 1000000000000000000)
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance before, val: 10000000000000000000)
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance before, val: 0)
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance after, val: 1000000000000000000)
    ├─ [491] [32m0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance after, val: 1000000000000000000)
    ├─ [0] [34mVM[0m::[34mselectFork[0m(4) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: fantom)
    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .250) [33m[0m
    │   └─ [34m← [0m0x00000000000000000000000067efa679a4b56c38713d478e649c88247f4f8e880000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000021be370d5312f44cb42ce377bc9b8a0cef1a4c83000000000000000000000000def189deaef76e379df891899eb5a00a94cbc250000000000000000000000000b4d961671cadfed687e040b076eee29840c142e5000000000000000000000000f760c5b88d970d6f97e64e264dac5a3767dafd74000000000000000000000000ca64d4225804f2ae069760cb5ff2f1d8bac1c2f900000000000000000000000047f01db18a38261e4cb153bae6db7d3743acb33c000000000000000000000000e40f81ef6e9c95ba04c659b8d032eab73152aafd00000000000000000000000032df54951d33d7460e15fa59b1fcc262183ce4c2000000000000000000000000e87d69b285005cc82b53b844322652c49ed64600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000009b6aa8f26a92108e7d1f66373d757bb9551127030000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mdeal[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 10000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_string[0m(: -----Preparing ETH->WETH transformation through TransformERC20()-----)
    ├─ emit [36mlog_string[0m(:    --Building Up Transformations--)
    ├─ emit [36mlog_named_address[0m(key:     Finding TransformerDeployer nonce @, val: 0x47F01db18a38261E4cB153bAe6db7d3743AcB33c)
    ├─ emit [36mlog_named_uint[0m(key:        Deployer nonce, val: 4)
    ├─ emit [36mlog_string[0m(:    ---Calling TransformERC20()---)
    ├─ [2488] [32m0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [82433] [32m0xDEF189DeAEF76E379df891899eb5A00a94cBC250[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83, 1000000000000000000, 1000000000000000000, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[0m
    │   ├─ [77239] [32m0xEcd57ef87c0B7bF7b25196A511bd3766D80DC5f5[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83, 1000000000000000000, 1000000000000000000, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[delegatecall][0m
    │   │   ├─ [488] [32m0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [55] [32m0xb4D961671cadFeD687e040B076EEe29840C142e5[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [43697] [32m0xb4D961671cadFeD687e040B076EEe29840C142e5[0m::[32mexecuteDelegateCall[0m(0x9b6aA8f26A92108e7d1F66373d757Bb955112703, 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [39930] [32m0x9b6aA8f26A92108e7d1F66373d757Bb955112703[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [31713] [32m0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: 0x0000000000000000000000000000000000000000, _to: 0xb4D961671cadFeD687e040B076EEe29840C142e5, _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   │   │   └─ [32m← [0m0x13c9929e00000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [488] [32m0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83[0m::[32mbalanceOf[0m(0xb4D961671cadFeD687e040B076EEe29840C142e5) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ [19672] [32m0xb4D961671cadFeD687e040B076EEe29840C142e5[0m::[32mexecuteCall[0m(0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83, 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e840000000000000000000000000000000000000000000000000de0b6b3a7640000, 0) [33m[0m
    │   │   │   ├─ [18639] [32m0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83[0m::[32mtransfer[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   │   │   │   ├─ emit [36mTransfer[0m(_from: 0xb4D961671cadFeD687e040B076EEe29840C142e5, _to: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 1000000000000000000)
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [488] [32m0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ emit [36mTransformedERC20[0m(taker: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: 0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83, inputTokenAmount: 1000000000000000000, outputTokenAmount: 1000000000000000000)
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance before, val: 10000000000000000000)
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance before, val: 0)
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance after, val: 1000000000000000000)
    ├─ [488] [32m0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance after, val: 1000000000000000000)
    ├─ [0] [34mVM[0m::[34mselectFork[0m(5) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: optimism)
    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .10) [33m[0m
    │   └─ [34m← [0m0x00000000000000000000000055cf1d7535250db75bf0190493f55781ee583553000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004200000000000000000000000000000000000006000000000000000000000000def1abe32c034e558cdd535791643c58a13acc10000000000000000000000000a3128d9b7cca7d5af29780a56abeec12b05a67400000000000000000000000006d506b2847df0c6f04d2628da1adaf4d8fb2e81b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000003a539ed6bd42de8fbaf3899fb490c792e153d647000000000000000000000000845c75a791cceb1a451f4ca5778c011226dda95c000000000000000000000000085d10a34f14f6a631ea8ff7d016782ee3ffaa11000000000000000000000000b11e14565dfbeb702dea9bc0cb47f1a8b32f47830000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002ce7af6520e2862f961f5d7eda746642865179c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mdeal[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 10000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_string[0m(: -----Preparing ETH->WETH transformation through TransformERC20()-----)
    ├─ emit [36mlog_string[0m(:    --Building Up Transformations--)
    ├─ emit [36mlog_named_address[0m(key:     Finding TransformerDeployer nonce @, val: 0x3A539eD6bd42de8FBAf3899fb490c792e153D647)
    ├─ emit [36mlog_named_uint[0m(key:        Deployer nonce, val: 4)
    ├─ emit [36mlog_string[0m(:    ---Calling TransformERC20()---)
    ├─ [2457] [32m0x4200000000000000000000000000000000000006[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [75091] [32m0xDEF1ABE32c034e558Cdd535791643C58a13aCC10[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0x4200000000000000000000000000000000000006, 1000000000000000000, 1000000000000000000, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[0m
    │   ├─ [70463] [32m0x23e1fcF553A7dB590562f8a47bd76A28E358455E[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0x4200000000000000000000000000000000000006, 1000000000000000000, 1000000000000000000, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[delegatecall][0m
    │   │   ├─ [457] [32m0x4200000000000000000000000000000000000006[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [55] [32m0xA3128d9b7Cca7d5Af29780a56abEec12B05a6740[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [35786] [32m0xA3128d9b7Cca7d5Af29780a56abEec12B05a6740[0m::[32mexecuteDelegateCall[0m(0x02Ce7aF6520E2862F961f5D7Eda746642865179c, 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [32019] [32m0x02Ce7aF6520E2862F961f5D7Eda746642865179c[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [23802] [32m0x4200000000000000000000000000000000000006[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ emit [36mDeposit[0m(_owner: 0xA3128d9b7Cca7d5Af29780a56abEec12B05a6740, _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   └─ [32m← [0m0x13c9929e00000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [457] [32m0x4200000000000000000000000000000000000006[0m::[32mbalanceOf[0m(0xA3128d9b7Cca7d5Af29780a56abEec12B05a6740) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ [19354] [32m0xA3128d9b7Cca7d5Af29780a56abEec12B05a6740[0m::[32mexecuteCall[0m(0x4200000000000000000000000000000000000006, 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e840000000000000000000000000000000000000000000000000de0b6b3a7640000, 0) [33m[0m
    │   │   │   ├─ [18321] [32m0x4200000000000000000000000000000000000006[0m::[32mtransfer[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   │   │   │   ├─ emit [36mTransfer[0m(_from: 0xA3128d9b7Cca7d5Af29780a56abEec12B05a6740, _to: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 1000000000000000000)
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [457] [32m0x4200000000000000000000000000000000000006[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ emit [36mTransformedERC20[0m(taker: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: 0x4200000000000000000000000000000000000006, inputTokenAmount: 1000000000000000000, outputTokenAmount: 1000000000000000000)
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance before, val: 10000000000000000000)
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance before, val: 0)
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance after, val: 1000000000000000000)
    ├─ [457] [32m0x4200000000000000000000000000000000000006[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance after, val: 1000000000000000000)
    ├─ [0] [34mVM[0m::[34mselectFork[0m(6) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: arbitrum)
    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .42161) [33m[0m
    │   └─ [34m← [0m0x00000000000000000000000005a24978471869327904ea13da3c4322128e2aaa0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000db6f1920a889355780af7570773609bd8cb1f4980000000000000000000000001fe80d5ad9464dba2d60b88e449305f184823f8a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000029f80c1f685e19ae1807063eda432f431ac623d0000000000000000000000000466b00a77662245c2cc7b093a7102a687afc16f3000000000000000000000000ae3e8cf7bf340d7084f312dfae2aa8b01c885b02000000000000000000000000d56b9c014b45ed95e2a048a0c28121db30265f130000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010e968968f49dd66a5efeebbb2edcb9c49c4fc490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mdeal[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 10000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_string[0m(: -----Preparing ETH->WETH transformation through TransformERC20()-----)
    ├─ emit [36mlog_string[0m(:    --Building Up Transformations--)
    ├─ emit [36mlog_named_address[0m(key:     Finding TransformerDeployer nonce @, val: 0x29f80c1f685e19aE1807063eDa432F431ac623D0)
    ├─ emit [36mlog_named_uint[0m(key:        Deployer nonce, val: 4)
    ├─ emit [36mlog_string[0m(:    ---Calling TransformERC20()---)
    ├─ [9796] [32m0x82aF49447D8a07e3bd95BD0d56f35241523fBab1[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   ├─ [2553] [32m0x8b194bEae1d3e0788A1a35173978001ACDFba668[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [84288] [32m0xDef1C0ded9bec7F1a1670819833240f027b25EfF[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1, 1000000000000000000, 1000000000000000000, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[0m
    │   ├─ [78723] [32m0x45Daa83b927ad02065B543DF26Aa03a6e4cF9952[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1, 1000000000000000000, 1000000000000000000, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)]) [33m[delegatecall][0m
    │   │   ├─ [1296] [32m0x82aF49447D8a07e3bd95BD0d56f35241523fBab1[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   ├─ [553] [32m0x8b194bEae1d3e0788A1a35173978001ACDFba668[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [55] [32m0xdB6f1920A889355780aF7570773609Bd8Cb1f498[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [42395] [32m0xdB6f1920A889355780aF7570773609Bd8Cb1f498[0m::[32mexecuteDelegateCall[0m(0x10e968968f49dd66a5eFEeBBb2edcB9c49c4fC49, 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [38628] [32m0x10e968968f49dd66a5eFEeBBb2edcB9c49c4fC49[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [30411] [32m0x82aF49447D8a07e3bd95BD0d56f35241523fBab1[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ [29674] [32m0x8b194bEae1d3e0788A1a35173978001ACDFba668[0m::[32mdeposit[0m() [33m[delegatecall][0m
    │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: 0x0000000000000000000000000000000000000000, _to: 0xdB6f1920A889355780aF7570773609Bd8Cb1f498, _value: 1000000000000000000)
    │   │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   └─ [32m← [0m0x13c9929e00000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [1296] [32m0x82aF49447D8a07e3bd95BD0d56f35241523fBab1[0m::[32mbalanceOf[0m(0xdB6f1920A889355780aF7570773609Bd8Cb1f498) [33m[staticcall][0m
    │   │   │   ├─ [553] [32m0x8b194bEae1d3e0788A1a35173978001ACDFba668[0m::[32mbalanceOf[0m(0xdB6f1920A889355780aF7570773609Bd8Cb1f498) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ [20313] [32m0xdB6f1920A889355780aF7570773609Bd8Cb1f498[0m::[32mexecuteCall[0m(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1, 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e840000000000000000000000000000000000000000000000000de0b6b3a7640000, 0) [33m[0m
    │   │   │   ├─ [19280] [32m0x82aF49447D8a07e3bd95BD0d56f35241523fBab1[0m::[32mtransfer[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   │   │   │   ├─ [18684] [32m0x8b194bEae1d3e0788A1a35173978001ACDFba668[0m::[32mtransfer[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[delegatecall][0m
    │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: 0xdB6f1920A889355780aF7570773609Bd8Cb1f498, _to: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [1296] [32m0x82aF49447D8a07e3bd95BD0d56f35241523fBab1[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   ├─ [553] [32m0x8b194bEae1d3e0788A1a35173978001ACDFba668[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ emit [36mTransformedERC20[0m(taker: transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1, inputTokenAmount: 1000000000000000000, outputTokenAmount: 1000000000000000000)
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance before, val: 10000000000000000000)
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance before, val: 0)
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance after, val: 1000000000000000000)
    ├─ [1296] [32m0x82aF49447D8a07e3bd95BD0d56f35241523fBab1[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   ├─ [553] [32m0x8b194bEae1d3e0788A1a35173978001ACDFba668[0m::[32mbalanceOf[0m(transformERC20Tests: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance after, val: 1000000000000000000)
    └─ [32m← [0m()

Test result: [32mok[0m. 1 passed; 0 failed; finished in 5.36s

Running 1 test for contracts/test/foundry/LiveBridgeOrderTests.sol:ETHToERC20TransformTest
[32m[PASS][0m testSwapEthForERC20OnUniswap() (gas: 36953918)
Logs:
  SwapEthForERC20OnUniswap
    Selecting Fork On: mainnet
     Using contract addresses on chain: mainnet
             WethTransformer nonce: 6
             FillQuoteTransformer nonce: 26
         Sampling Uniswap for tokens
          : 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
             -> 
          : 0xdac17f958d2ee523a2206206994597c13d831ec7
          NativeAsset balance before: 1000000000000000000
          ERC-20 balance before: 0
          NativeAsset balance after: 1000000000000000000
          ERC-20 balance after: 1115501704
    Selecting Fork On: bsc
     Using contract addresses on chain: bsc
             WethTransformer nonce: 4
             FillQuoteTransformer nonce: 8
         Sampling Uniswap for tokens
          : 0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c
             -> 
          : 0x55d398326f99059ff775485246999027b3197955
          NativeAsset balance before: 1000000000000000000
          ERC-20 balance before: 0
          NativeAsset balance after: 1000000000000000000
          ERC-20 balance after: 410910257175451371506
    Selecting Fork On: polygon
     Using contract addresses on chain: polygon
             WethTransformer nonce: 4
             FillQuoteTransformer nonce: 12
         Sampling Uniswap for tokens
          : 0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270
             -> 
          : 0xc2132d05d31c914a87c6611c10748aeb04b58e8f
          NativeAsset balance before: 1000000000000000000
          ERC-20 balance before: 0
          NativeAsset balance after: 1000000000000000000
          ERC-20 balance after: 755548
    Selecting Fork On: optimism
     Using contract addresses on chain: optimism
      Liquidity Source Not available on this chain
    Selecting Fork On: arbitrum
     Using contract addresses on chain: arbitrum
             WethTransformer nonce: 4
             FillQuoteTransformer nonce: 7
         Sampling Uniswap for tokens
          : 0x82af49447d8a07e3bd95bd0d56f35241523fbab1
             -> 
          : 0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9
          NativeAsset balance before: 1000000000000000000
          ERC-20 balance before: 0
          NativeAsset balance after: 1000000000000000000
          ERC-20 balance after: 992075804

Traces:
  [36953918] [32mETHToERC20TransformTest[0m::[32mtestSwapEthForERC20OnUniswap[0m() [33m[0m
    ├─ emit [36mlog_string[0m(: SwapEthForERC20OnUniswap)
    ├─ [0] [34mVM[0m::[34mselectFork[0m(0) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: mainnet)
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000da6d9fc5998f550a094585cf9171f0e8ee3ac59f0000000000000000000000008ed95d1746bf1e4dab58d8ed4724f1ef95b20db0000000000000000000000000d8c38704c9937ea3312de29f824b4ad3450a5e61000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18000000000000000000000000618f9c67ce7bf1a50afa1e7e0238422601b0ff6e000000000000000000000000407b4128e9ecad8769b2332312a9f655cb9f5f3a00000000000000000000000039dce47a67ad34344eab877eae3ef1fa2a1d50bb000000000000000000000000d75a9019a2a1782ea670e4f4a55f04b43514ed530000000000000000000000004638a7ebe75b911b995d0ec73a81e4f85f41f24e000000000000000000000000a9416ce1dbde8d331210c07b5c253d94ee4cc3fd0000000000000000000000002a17c35ff147b32f13f19f2e311446eeb02503f3000000000000000000000000a26e80e7dea86279c6d778d702cc413e6cffa777000000000000000000000000b2bc06a4efb20fc6553a69dbfa49b7be938034a70000000000000000000000007d3455421bbc5ed534a83c88fd80387dc8271392000000000000000000000000e41d2489571d322189246dafa5ebde1f4699f4980000000000000000000000000bb1810061c2f5b2088054ee184e6c79e1591101000000000000000000000000ba7f8b5fb1b19c1211c5d49550fcd149177a5eaf
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000f164fc0ec4e93095b804a4795bbe1e041497b92a
    ├─ emit [36mlog_named_string[0m(key:    Using contract addresses on chain, val: mainnet)
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/affiliateFeeTransformer: [0xdA6D9FC5998f550a094585cf9171f0E8eE3Ac59F], zeroEx/affiliateFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/erc20BridgeProxy: [0x8ED95d1746bf1E4dAb58d8ED4724f1Ef95B20Db0], zeroEx/erc20BridgeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/erc20BridgeSampler: [0xD8C38704c9937eA3312De29F824b4AD3450a5e61], zeroEx/erc20BridgeSampler) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2], zeroEx/etherToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF], zeroEx/exchangeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], zeroEx/exchangeProxyFlashWallet) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyGovernor: [0x618F9C67CE7Bf1a50afa1E7e0238422601b0ff6e], zeroEx/exchangeProxyGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyLiquidityProviderSandbox: [0x407B4128E9eCaD8769B2332312a9F655cB9F5F3A], zeroEx/exchangeProxyLiquidityProviderSandbox) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyTransformerDeployer: [0x39dCe47a67aD34344EAB877eaE3Ef1FA2a1d50Bb], zeroEx/exchangeProxyTransformerDeployer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/fillQuoteTransformer: [0xd75A9019a2A1782Ea670e4F4a55f04B43514ed53], zeroEx/fillQuoteTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/payTakerTransformer: [0x4638A7Ebe75b911B995D0ec73a81E4f85F41F24E], zeroEx/payTakerTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/positiveSlippageFeeTransformer: [0xA9416Ce1dBDE8D331210C07B5C253D94ee4cC3Fd], zeroEx/positiveSlippageFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/staking: [0x2a17c35FF147b32f13F19F2E311446eEB02503F3], zeroEx/staking) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/stakingProxy: [0xa26e80e7Dea86279c6d778D702Cc413E6CFfA777], zeroEx/stakingProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/wethTransformer: [0xb2bc06a4EfB20FC6553a69Dbfa49B7bE938034A7], zeroEx/wethTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zeroExGovernor: [0x7D3455421BbC5Ed534a83c88FD80387dc8271392], zeroEx/zeroExGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxToken: [0xE41d2489571d322189246DaFA5ebDe1F4699F498], zeroEx/zrxToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxTreasury: [0x0bB1810061C2f5b2088054eE184E6C79e1591101], zeroEx/zrxTreasury) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0xBa7f8b5fB1b19c1211c5d49550fcD149177A5Eaf], zeroEx/zrxVault) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2], WrappedNativeToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDT: [0xdAC17F958D2ee523a2206206994597C13D831ec7], USDT) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], USDC) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(DAI: [0x6B175474E89094C44Da98b954EedeAC495271d0F], DAI) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(UniswapRouter: [0xf164fC0Ec4E93095b804a4795bBe1e041497b92a], UniswapRouter) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000da6d9fc5998f550a094585cf9171f0e8ee3ac59f0000000000000000000000008ed95d1746bf1e4dab58d8ed4724f1ef95b20db0000000000000000000000000d8c38704c9937ea3312de29f824b4ad3450a5e61000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18000000000000000000000000618f9c67ce7bf1a50afa1e7e0238422601b0ff6e000000000000000000000000407b4128e9ecad8769b2332312a9f655cb9f5f3a00000000000000000000000039dce47a67ad34344eab877eae3ef1fa2a1d50bb000000000000000000000000d75a9019a2a1782ea670e4f4a55f04b43514ed530000000000000000000000004638a7ebe75b911b995d0ec73a81e4f85f41f24e000000000000000000000000a9416ce1dbde8d331210c07b5c253d94ee4cc3fd0000000000000000000000002a17c35ff147b32f13f19f2e311446eeb02503f3000000000000000000000000a26e80e7dea86279c6d778d702cc413e6cffa777000000000000000000000000b2bc06a4efb20fc6553a69dbfa49b7be938034a70000000000000000000000007d3455421bbc5ed534a83c88fd80387dc8271392000000000000000000000000e41d2489571d322189246dafa5ebde1f4699f4980000000000000000000000000bb1810061c2f5b2088054ee184e6c79e1591101000000000000000000000000ba7f8b5fb1b19c1211c5d49550fcd149177a5eaf
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000f164fc0ec4e93095b804a4795bbe1e041497b92a
    ├─ emit [36mlog_named_uint[0m(key:            WethTransformer nonce, val: 6)
    ├─ [0] [34mVM[0m::[34mstartPrank[0m(zeroEx/exchangeProxyTransformerDeployer: [0x39dCe47a67aD34344EAB877eaE3Ef1FA2a1d50Bb]) [33m[0m
    │   └─ [34m← [0m()
    ├─ [4888125] [33m→ [0m[33mnew[0m zeroEx/fillQuoteTransformer@0xd75A9019a2A1782Ea670e4F4a55f04B43514ed53
    │   └─ [32m← [0m24408 bytes of code
    ├─ [2227758] [33m→ [0m[33mnew[0m zeroEx/FillQuoteTransformer@0xd8E10b0689d0B2f28136777635caA4AbD2bB9F04
    │   └─ [32m← [0m11124 bytes of code
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/FillQuoteTransformer: [0xd8E10b0689d0B2f28136777635caA4AbD2bB9F04], zeroEx/FillQuoteTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mstopPrank[0m() [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_uint[0m(key:            FillQuoteTransformer nonce, val: 26)
    ├─ [359399] [33m→ [0m[33mnew[0m UniswapV2Sampler@0xCe71065D4017F316EC606Fe4422e11eB2c47c246
    │   └─ [32m← [0m1795 bytes of code
    ├─ [0] [34mVM[0m::[34mlabel[0m(UniswapV2Sampler: [0xCe71065D4017F316EC606Fe4422e11eB2c47c246], UniswapV2Sampler) [33m[0m
    │   └─ [34m← [0m()
    ├─ [14730] [32mUniswapV2Sampler[0m::[32msampleSellsFromUniswapV2[0m(UniswapRouter: [0xf164fC0Ec4E93095b804a4795bBe1e041497b92a], [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 0xdAC17F958D2ee523a2206206994597C13D831ec7], [1000000000000000000]) [33m[staticcall][0m
    │   ├─ [8560] [32mUniswapRouter[0m::[32mgetAmountsOut[0m(1000000000000000000, [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 0xdAC17F958D2ee523a2206206994597C13D831ec7]) [33m[staticcall][0m
    │   │   ├─ [2504] [32m0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852[0m::[32mgetReserves[0m() [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000289575f6824c067a73d00000000000000000000000000000000000000000000000000000c30a4a7a30e0000000000000000000000000000000000000000000000000000000062b12cb8
    │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000427d3488
    │   └─ [32m← [0m[1115501704]
    ├─ emit [36mlog_string[0m(:        Sampling Uniswap for tokens)
    ├─ emit [36mlog_named_address[0m(key:         , val: WrappedNativeToken: [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2])
    ├─ emit [36mlog_string[0m(:            -> )
    ├─ emit [36mlog_named_address[0m(key:         , val: USDT: [0xdAC17F958D2ee523a2206206994597C13D831ec7])
    ├─ [0] [34mVM[0m::[34mdeal[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [5031] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [179302] [32mzeroEx/exchangeProxy[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, USDT: [0xdAC17F958D2ee523a2206206994597C13D831ec7], 1000000000000000000, 1115501704, [(6, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000), (26, 0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000427d3488000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000f164fc0ec4e93095b804a4795bbe1e041497b92a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000)]) [33m[0m
    │   ├─ [173111] [32m0x44A6999Ec971cfCA458AFf25A808F272f6d492A2[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, USDT: [0xdAC17F958D2ee523a2206206994597C13D831ec7], 1000000000000000000, 1115501704, [(6, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000), (26, 0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000427d3488000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000f164fc0ec4e93095b804a4795bbe1e041497b92a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000)]) [33m[delegatecall][0m
    │   │   ├─ [1031] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [55] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [38458] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteDelegateCall[0m(zeroEx/wethTransformer: [0xb2bc06a4EfB20FC6553a69Dbfa49B7bE938034A7], 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [34691] [32mzeroEx/wethTransformer[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [23974] [32mWrappedNativeToken[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ emit [36mDeposit[0m(_owner: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   └─ [32m← [0m0x13c9929e
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [89012] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteDelegateCall[0m(zeroEx/FillQuoteTransformer: [0xd8E10b0689d0B2f28136777635caA4AbD2bB9F04], 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e840000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000038000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000427d3488000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000f164fc0ec4e93095b804a4795bbe1e041497b92a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000) [33m[0m
    │   │   │   ├─ [87872] [32mzeroEx/FillQuoteTransformer[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000427d3488000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000f164fc0ec4e93095b804a4795bbe1e041497b92a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [534] [32mWrappedNativeToken[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18]) [33m[staticcall][0m
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   │   ├─ [78924] [32mzeroEx/fillQuoteTransformer[0m::[32mtrade[0m((0x0000000000000000000000000000000200000000000000000000000000000000, 1000000000000000000, 1115501704, 0x000000000000000000000000f164fc0ec4e93095b804a4795bbe1e041497b92a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7), WrappedNativeToken: [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2], USDT: [0xdAC17F958D2ee523a2206206994597C13D831ec7], 1000000000000000000) [33m[delegatecall][0m
    │   │   │   │   │   ├─ [2717] [32mWrappedNativeToken[0m::[32mallowance[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], UniswapRouter: [0xf164fC0Ec4E93095b804a4795bBe1e041497b92a]) [33m[staticcall][0m
    │   │   │   │   │   │   └─ [32m← [0m0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
    │   │   │   │   │   ├─ [71055] [32mUniswapRouter[0m::[32mswapExactTokensForTokens[0m(1000000000000000000, 1, [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 0xdAC17F958D2ee523a2206206994597C13D831ec7], zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], 1655778500) [33m[0m
    │   │   │   │   │   │   ├─ [504] [32m0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852[0m::[32mgetReserves[0m() [33m[staticcall][0m
    │   │   │   │   │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000289575f6824c067a73d00000000000000000000000000000000000000000000000000000c30a4a7a30e0000000000000000000000000000000000000000000000000000000062b12cb8
    │   │   │   │   │   │   ├─ [6580] [32mWrappedNativeToken[0m::[32mtransferFrom[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], 0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852, 1000000000000000000) [33m[0m
    │   │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], _to: 0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852, _value: 1000000000000000000)
    │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   ├─ [69562] [32m0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852[0m::[32mswap[0m(0, 1115501704, zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], 0x) [33m[0m
    │   │   │   │   │   │   │   ├─ [39601] [32mUSDT[0m::[32mtransfer[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], 1115501704) [33m[0m
    │   │   │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: 0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852, _to: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], _value: 1115501704)
    │   │   │   │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   │   │   │   ├─ [534] [32mWrappedNativeToken[0m::[32mbalanceOf[0m(0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852) [33m[staticcall][0m
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000028965401ed867cba73d
    │   │   │   │   │   │   │   ├─ [1031] [32mUSDT[0m::[32mbalanceOf[0m(0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852) [33m[staticcall][0m
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000c30622a6e86
    │   │   │   │   │   │   │   ├─ emit [36mSync[0m(: 11979232769148642371389, : 13401944911494)
    │   │   │   │   │   │   │   ├─ emit [36mSwap[0m(param0: UniswapRouter: [0xf164fC0Ec4E93095b804a4795bBe1e041497b92a], param1: 1000000000000000000, param2: 0, param3: 0, param4: 1115501704, param5: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18])
    │   │   │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000427d3488
    │   │   │   │   │   ├─ emit [36mBridgeFill[0m(source: 0x0000000000000000000000000000000200000000000000000000000000000000, inputToken: WrappedNativeToken: [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2], outputToken: USDT: [0xdAC17F958D2ee523a2206206994597C13D831ec7], inputTokenAmount: 1000000000000000000, outputTokenAmount: 1115501704)
    │   │   │   │   │   └─ [32m← [0m1115501704
    │   │   │   │   └─ [32m← [0m0x13c9929e
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [1031] [32mUSDT[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000427d3488
    │   │   ├─ [22352] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteCall[0m(USDT: [0xdAC17F958D2ee523a2206206994597C13D831ec7], 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000427d3488, 0) [33m[0m
    │   │   │   ├─ [21441] [32mUSDT[0m::[32mtransfer[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1115501704) [33m[0m
    │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], _to: ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 1115501704)
    │   │   │   │   └─ [32m← [0m()
    │   │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [1031] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000427d3488
    │   │   ├─ emit [36mTransformedERC20[0m(taker: ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: USDT: [0xdAC17F958D2ee523a2206206994597C13D831ec7], inputTokenAmount: 1000000000000000000, outputTokenAmount: 1115501704)
    │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000427d3488
    │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000427d3488
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance before, val: 1000000000000000000)
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance before, val: 0)
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance after, val: 1000000000000000000)
    ├─ [1031] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000427d3488
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance after, val: 1115501704)
    ├─ [1031] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000427d3488
    ├─ [0] [34mVM[0m::[34mselectFork[0m(1) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: bsc)
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .56) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000001af3f329e8be154074d8769d1ffa4ee058b1dbc30000000000000000000000008ac76a51cc950d9822d68b83fe1ad97b32cd580d00000000000000000000000055d398326f99059ff775485246999027b3197955000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .56) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000001be34ab9b2acb5c4ddd89454bdce637967e6523000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000db6f1920a889355780af7570773609bd8cb1f498000000000000000000000000ccc9769c1a58766e79423a34b2cc5052d65c1983000000000000000000000000de7b2747624a647600fdb349184d0448ab9549290000000000000000000000008224aa8fe5c9f07d5a59c735386ff6cc6aaeb568000000000000000000000000bd7fd6e116fc8589bb658fba3a2cc6273050bcf20000000000000000000000004f5e8ca2cadecd4a467ae441e4b03de4278a45740000000000000000000000007f5c79ad1788573b1145f4651a248523c54f5d1f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ac3d95668c092e895cd83a9cbafe9c7d9906471f0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .56) [33m[0m
    │   └─ [34m← [0m0x00000000000000000000000010ed43c718714eb63d5aa57b78b54704e256024e
    ├─ emit [36mlog_named_string[0m(key:    Using contract addresses on chain, val: bsc)
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/affiliateFeeTransformer: [0x1BE34aB9b2aCB5c4Ddd89454BDCe637967e65230], zeroEx/affiliateFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/erc20BridgeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/erc20BridgeSampler) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c], zeroEx/etherToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF], zeroEx/exchangeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], zeroEx/exchangeProxyFlashWallet) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyGovernor: [0xCcc9769c1a58766E79423a34B2cc5052D65C1983], zeroEx/exchangeProxyGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyLiquidityProviderSandbox: [0xde7b2747624a647600FDB349184d0448ab954929], zeroEx/exchangeProxyLiquidityProviderSandbox) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyTransformerDeployer: [0x8224aa8FE5c9f07d5a59c735386fF6CC6AAEB568], zeroEx/exchangeProxyTransformerDeployer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/FillQuoteTransformer: [0xbd7fD6E116Fc8589bb658fBA3A2cC6273050bcF2], zeroEx/fillQuoteTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/payTakerTransformer: [0x4f5E8cA2CADEcD4A467Ae441e4B03DE4278A4574], zeroEx/payTakerTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/positiveSlippageFeeTransformer: [0x7F5C79aD1788573B1145f4651a248523c54F5D1f], zeroEx/positiveSlippageFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/staking) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/stakingProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/wethTransformer: [0xAc3D95668c092e895cd83A9CBAfE9C7D9906471f], zeroEx/wethTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zeroExGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zrxToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zrxTreasury) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zrxVault) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c], WrappedNativeToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDT: [0x55d398326f99059fF775485246999027B3197955], USDT) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDC: [0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d], USDC) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(DAI: [0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3], DAI) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(UniswapRouter: [0x10ED43C718714eb63d5aA57B78B54704E256024E], UniswapRouter) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .56) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000001af3f329e8be154074d8769d1ffa4ee058b1dbc30000000000000000000000008ac76a51cc950d9822d68b83fe1ad97b32cd580d00000000000000000000000055d398326f99059ff775485246999027b3197955000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .56) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000001be34ab9b2acb5c4ddd89454bdce637967e6523000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000db6f1920a889355780af7570773609bd8cb1f498000000000000000000000000ccc9769c1a58766e79423a34b2cc5052d65c1983000000000000000000000000de7b2747624a647600fdb349184d0448ab9549290000000000000000000000008224aa8fe5c9f07d5a59c735386ff6cc6aaeb568000000000000000000000000bd7fd6e116fc8589bb658fba3a2cc6273050bcf20000000000000000000000004f5e8ca2cadecd4a467ae441e4b03de4278a45740000000000000000000000007f5c79ad1788573b1145f4651a248523c54f5d1f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ac3d95668c092e895cd83a9cbafe9c7d9906471f0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .56) [33m[0m
    │   └─ [34m← [0m0x00000000000000000000000010ed43c718714eb63d5aa57b78b54704e256024e
    ├─ emit [36mlog_named_uint[0m(key:            WethTransformer nonce, val: 4)
    ├─ [0] [34mVM[0m::[34mstartPrank[0m(zeroEx/exchangeProxyTransformerDeployer: [0x8224aa8FE5c9f07d5a59c735386fF6CC6AAEB568]) [33m[0m
    │   └─ [34m← [0m()
    ├─ [2253695] [33m→ [0m[33mnew[0m BSCBridgeAdapter@0x0b72D55485E8d877F73Cc8b14EA3E010b3E804fd
    │   └─ [32m← [0m11254 bytes of code
    ├─ [2227758] [33m→ [0m[33mnew[0m zeroEx/FillQuoteTransformer@0xbd7fD6E116Fc8589bb658fBA3A2cC6273050bcF2
    │   └─ [32m← [0m11124 bytes of code
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/FillQuoteTransformer: [0xbd7fD6E116Fc8589bb658fBA3A2cC6273050bcF2], zeroEx/FillQuoteTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mstopPrank[0m() [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_uint[0m(key:            FillQuoteTransformer nonce, val: 8)
    ├─ [359399] [33m→ [0m[33mnew[0m UniswapV2Sampler@0x185a4dc360CE69bDCceE33b3784B0282f7961aea
    │   └─ [32m← [0m1795 bytes of code
    ├─ [0] [34mVM[0m::[34mlabel[0m(UniswapV2Sampler: [0x185a4dc360CE69bDCceE33b3784B0282f7961aea], UniswapV2Sampler) [33m[0m
    │   └─ [34m← [0m()
    ├─ [15821] [32mUniswapV2Sampler[0m::[32msampleSellsFromUniswapV2[0m(UniswapRouter: [0x10ED43C718714eb63d5aA57B78B54704E256024E], [0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c, 0x55d398326f99059fF775485246999027B3197955], [1000000000000000000]) [33m[staticcall][0m
    │   ├─ [9651] [32mUniswapRouter[0m::[32mgetAmountsOut[0m(1000000000000000000, [0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c, 0x55d398326f99059fF775485246999027B3197955]) [33m[staticcall][0m
    │   │   ├─ [2893] [32m0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE[0m::[32mgetReserves[0m() [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000005470f61ea790fc4e8288de000000000000000000000000000000000000000000003479cc127bec5be7a4bd0000000000000000000000000000000000000000000000000000000061fee3c6
    │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000001646867dce232f87f2
    │   └─ [32m← [0m[410910257175451371506]
    ├─ emit [36mlog_string[0m(:        Sampling Uniswap for tokens)
    ├─ emit [36mlog_named_address[0m(key:         , val: WrappedNativeToken: [0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c])
    ├─ emit [36mlog_string[0m(:            -> )
    ├─ emit [36mlog_named_address[0m(key:         , val: USDT: [0x55d398326f99059fF775485246999027B3197955])
    ├─ [0] [34mVM[0m::[34mdeal[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [2531] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [159653] [32mzeroEx/exchangeProxy[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, USDT: [0x55d398326f99059fF775485246999027B3197955], 1000000000000000000, 410910257175451371506, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000), (8, 0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c00000000000000000000000055d398326f99059ff775485246999027b3197955000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000001646867dce232f87f2000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000010ed43c718714eb63d5aa57b78b54704e256024e00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c00000000000000000000000055d398326f99059ff775485246999027b319795500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000)]) [33m[0m
    │   ├─ [154705] [32m0xfcEB29377a6e0A86E9fa648016b459AB8Fbfcf5A[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, USDT: [0x55d398326f99059fF775485246999027B3197955], 1000000000000000000, 410910257175451371506, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000), (8, 0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c00000000000000000000000055d398326f99059ff775485246999027b3197955000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000001646867dce232f87f2000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000010ed43c718714eb63d5aa57b78b54704e256024e00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c00000000000000000000000055d398326f99059ff775485246999027b319795500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000)]) [33m[delegatecall][0m
    │   │   ├─ [531] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [55] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [38458] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteDelegateCall[0m(zeroEx/wethTransformer: [0xAc3D95668c092e895cd83A9CBAfE9C7D9906471f], 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [34691] [32mzeroEx/wethTransformer[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [23974] [32mWrappedNativeToken[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ emit [36mDeposit[0m(_owner: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   └─ [32m← [0m0x13c9929e
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [75021] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteDelegateCall[0m(zeroEx/FillQuoteTransformer: [0xbd7fD6E116Fc8589bb658fBA3A2cC6273050bcF2], 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e840000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000038000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c00000000000000000000000055d398326f99059ff775485246999027b3197955000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000001646867dce232f87f2000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000010ed43c718714eb63d5aa57b78b54704e256024e00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c00000000000000000000000055d398326f99059ff775485246999027b319795500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000) [33m[0m
    │   │   │   ├─ [73881] [32mzeroEx/FillQuoteTransformer[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c00000000000000000000000055d398326f99059ff775485246999027b3197955000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000001646867dce232f87f2000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000010ed43c718714eb63d5aa57b78b54704e256024e00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c00000000000000000000000055d398326f99059ff775485246999027b319795500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [534] [32mWrappedNativeToken[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498]) [33m[staticcall][0m
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   │   ├─ [64933] [32mBSCBridgeAdapter[0m::[32mtrade[0m((0x0000000000000000000000000000000200000000000000000000000000000000, 1000000000000000000, 410910257175451371506, 0x00000000000000000000000010ed43c718714eb63d5aa57b78b54704e256024e00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c00000000000000000000000055d398326f99059ff775485246999027b3197955), WrappedNativeToken: [0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c], USDT: [0x55d398326f99059fF775485246999027B3197955], 1000000000000000000) [33m[delegatecall][0m
    │   │   │   │   │   ├─ [2717] [32mWrappedNativeToken[0m::[32mallowance[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], UniswapRouter: [0x10ED43C718714eb63d5aA57B78B54704E256024E]) [33m[staticcall][0m
    │   │   │   │   │   │   └─ [32m← [0m0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
    │   │   │   │   │   ├─ [57161] [32mUniswapRouter[0m::[32mswapExactTokensForTokens[0m(1000000000000000000, 1, [0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c, 0x55d398326f99059fF775485246999027B3197955], zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 1644094406) [33m[0m
    │   │   │   │   │   │   ├─ [893] [32m0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE[0m::[32mgetReserves[0m() [33m[staticcall][0m
    │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000005470f61ea790fc4e8288de000000000000000000000000000000000000000000003479cc127bec5be7a4bd0000000000000000000000000000000000000000000000000000000061fee3c6
    │   │   │   │   │   │   ├─ [6580] [32mWrappedNativeToken[0m::[32mtransferFrom[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE, 1000000000000000000) [33m[0m
    │   │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _to: 0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE, _value: 1000000000000000000)
    │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   ├─ [51064] [32m0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE[0m::[32mswap[0m(410910257175451371506, 0, zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 0x) [33m[0m
    │   │   │   │   │   │   │   ├─ [29971] [32mUSDT[0m::[32mtransfer[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 410910257175451371506) [33m[0m
    │   │   │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: 0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE, _to: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _value: 410910257175451371506)
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   │   ├─ [531] [32mUSDT[0m::[32mbalanceOf[0m(0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE) [33m[staticcall][0m
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000005470dfd821132e2b5300ec
    │   │   │   │   │   │   │   ├─ [534] [32mWrappedNativeToken[0m::[32mbalanceOf[0m(0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE) [33m[staticcall][0m
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000003479d9f332a0034ba4bd
    │   │   │   │   │   │   │   ├─ emit [36mSync[0m(: 102082803091388763609432300, : 247810818094128809354429)
    │   │   │   │   │   │   │   ├─ emit [36mSwap[0m(param0: UniswapRouter: [0x10ED43C718714eb63d5aA57B78B54704E256024E], param1: 0, param2: 1000000000000000000, param3: 410910257175451371506, param4: 0, param5: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498])
    │   │   │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000001646867dce232f87f2
    │   │   │   │   │   ├─ emit [36mBridgeFill[0m(source: 0x0000000000000000000000000000000200000000000000000000000000000000, inputToken: WrappedNativeToken: [0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c], outputToken: USDT: [0x55d398326f99059fF775485246999027B3197955], inputTokenAmount: 1000000000000000000, outputTokenAmount: 410910257175451371506)
    │   │   │   │   │   └─ [32m← [0m410910257175451371506
    │   │   │   │   └─ [32m← [0m0x13c9929e
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [531] [32mUSDT[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000001646867dce232f87f2
    │   │   ├─ [19570] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteCall[0m(USDT: [0x55d398326f99059fF775485246999027B3197955], 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000001646867dce232f87f2, 0) [33m[0m
    │   │   │   ├─ [18537] [32mUSDT[0m::[32mtransfer[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 410910257175451371506) [33m[0m
    │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _to: ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 410910257175451371506)
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [531] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000001646867dce232f87f2
    │   │   ├─ emit [36mTransformedERC20[0m(taker: ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: USDT: [0x55d398326f99059fF775485246999027B3197955], inputTokenAmount: 1000000000000000000, outputTokenAmount: 410910257175451371506)
    │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000001646867dce232f87f2
    │   └─ [32m← [0m0x00000000000000000000000000000000000000000000001646867dce232f87f2
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance before, val: 1000000000000000000)
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance before, val: 0)
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance after, val: 1000000000000000000)
    ├─ [531] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x00000000000000000000000000000000000000000000001646867dce232f87f2
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance after, val: 410910257175451371506)
    ├─ [531] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   └─ [32m← [0m0x00000000000000000000000000000000000000000000001646867dce232f87f2
    ├─ [0] [34mVM[0m::[34mselectFork[0m(2) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: polygon)
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .137) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000008f3cf7ad23cd3cadbd9735aff958023239c6a0630000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f0000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .137) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000bed27284b42e5684e987169cf1da09c5d6c49fa8000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000db6f1920a889355780af7570773609bd8cb1f4980000000000000000000000004d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae60000000000000000000000004dd97080adf36103bd3db822f9d3c0e44890fd69000000000000000000000000e6d9207df11c55bce2f7a189ae95e3222d5484d300000000000000000000000001c082e47c8dc6dedd01e3fcb07bfd3eb72e044d0000000000000000000000005ba7b9be86cda01cfbf56e0fb97184783be9dda10000000000000000000000004cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e309d011cc6f189a3e8dcba85922715a019fed380000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .137) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b47997506
    ├─ emit [36mlog_named_string[0m(key:    Using contract addresses on chain, val: polygon)
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/affiliateFeeTransformer: [0xbed27284B42E5684e987169CF1da09c5D6C49fa8], zeroEx/affiliateFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/erc20BridgeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/erc20BridgeSampler) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270], zeroEx/etherToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF], zeroEx/exchangeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], zeroEx/exchangeProxyFlashWallet) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyGovernor: [0x4d3E56C56a55d23fc7AA9A9FFaD61631cF7D1ae6], zeroEx/exchangeProxyGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyLiquidityProviderSandbox: [0x4Dd97080aDf36103bD3db822f9d3c0e44890fd69], zeroEx/exchangeProxyLiquidityProviderSandbox) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyTransformerDeployer: [0xe6d9207df11C55Bce2F7a189Ae95e3222d5484D3], zeroEx/exchangeProxyTransformerDeployer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/fillQuoteTransformer: [0x01C082e47C8dC6dedD01e3FCb07bFd3eb72E044D], zeroEx/fillQuoteTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/payTakerTransformer: [0x5ba7B9bE86Cda01CfBf56e0Fb97184783BE9dda1], zeroEx/payTakerTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/positiveSlippageFeeTransformer: [0x4cD8F1c0DF4d40fcC1E073845D5f6f4ed5CC8dAb], zeroEx/positiveSlippageFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/staking) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/stakingProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/wethTransformer: [0xE309D011cC6F189A3e8DCBa85922715A019FED38], zeroEx/wethTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zeroExGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zrxToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zrxTreasury) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zrxVault) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270], WrappedNativeToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDT: [0xc2132D05D31c914a87C6611C10748AEb04B58e8F], USDT) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDC: [0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174], USDC) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(DAI: [0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063], DAI) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(UniswapRouter: [0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506], UniswapRouter) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .137) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000008f3cf7ad23cd3cadbd9735aff958023239c6a0630000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f0000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .137) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000bed27284b42e5684e987169cf1da09c5d6c49fa8000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000db6f1920a889355780af7570773609bd8cb1f4980000000000000000000000004d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae60000000000000000000000004dd97080adf36103bd3db822f9d3c0e44890fd69000000000000000000000000e6d9207df11c55bce2f7a189ae95e3222d5484d300000000000000000000000001c082e47c8dc6dedd01e3fcb07bfd3eb72e044d0000000000000000000000005ba7b9be86cda01cfbf56e0fb97184783be9dda10000000000000000000000004cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e309d011cc6f189a3e8dcba85922715a019fed380000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .137) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b47997506
    ├─ emit [36mlog_named_uint[0m(key:            WethTransformer nonce, val: 4)
    ├─ [0] [34mVM[0m::[34mstartPrank[0m(zeroEx/exchangeProxyTransformerDeployer: [0xe6d9207df11C55Bce2F7a189Ae95e3222d5484D3]) [33m[0m
    │   └─ [34m← [0m()
    ├─ [2929799] [33m→ [0m[33mnew[0m PolygonBridgeAdapter@0xF79071E2f860D48A08Fd7E091D4B126a1D757148
    │   └─ [32m← [0m14631 bytes of code
    ├─ [2227758] [33m→ [0m[33mnew[0m zeroEx/FillQuoteTransformer@0xeD8932cA083E1eF1960dEa875A132926E6b242Ab
    │   └─ [32m← [0m11124 bytes of code
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/FillQuoteTransformer: [0xeD8932cA083E1eF1960dEa875A132926E6b242Ab], zeroEx/FillQuoteTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mstopPrank[0m() [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_uint[0m(key:            FillQuoteTransformer nonce, val: 12)
    ├─ [359399] [33m→ [0m[33mnew[0m UniswapV2Sampler@0xEFc56627233b02eA95bAE7e19F648d7DcD5Bb132
    │   └─ [32m← [0m1795 bytes of code
    ├─ [0] [34mVM[0m::[34mlabel[0m(UniswapV2Sampler: [0xEFc56627233b02eA95bAE7e19F648d7DcD5Bb132], UniswapV2Sampler) [33m[0m
    │   └─ [34m← [0m()
    ├─ [14904] [32mUniswapV2Sampler[0m::[32msampleSellsFromUniswapV2[0m(UniswapRouter: [0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506], [0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270, 0xc2132D05D31c914a87C6611C10748AEb04B58e8F], [1000000000000000000]) [33m[staticcall][0m
    │   ├─ [8734] [32mUniswapRouter[0m::[32mgetAmountsOut[0m(1000000000000000000, [0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270, 0xc2132D05D31c914a87C6611C10748AEb04B58e8F]) [33m[staticcall][0m
    │   │   ├─ [2517] [32m0x55FF76BFFC3Cdd9D5FdbBC2ece4528ECcE45047e[0m::[32mgetReserves[0m() [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000004bf87ac945510b0329200000000000000000000000000000000000000000000000000000003f4ddd9d300000000000000000000000000000000000000000000000000000000632d09b7
    │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000b875c
    │   └─ [32m← [0m[755548]
    ├─ emit [36mlog_string[0m(:        Sampling Uniswap for tokens)
    ├─ emit [36mlog_named_address[0m(key:         , val: WrappedNativeToken: [0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270])
    ├─ emit [36mlog_string[0m(:            -> )
    ├─ emit [36mlog_named_address[0m(key:         , val: USDT: [0xc2132D05D31c914a87C6611C10748AEb04B58e8F])
    ├─ [0] [34mVM[0m::[34mdeal[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [7962] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   ├─ [2608] [32m0x7FFB3d637014488b63fb9858E279385685AFc1e2[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [171698] [32mzeroEx/exchangeProxy[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, USDT: [0xc2132D05D31c914a87C6611C10748AEb04B58e8F], 1000000000000000000, 755548, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000), (12, 0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000b875c000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b47997506000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000)]) [33m[0m
    │   ├─ [166491] [32m0x33AA21AA1Ad5d6cAe3c713dE407B97f4b47321A3[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, USDT: [0xc2132D05D31c914a87C6611C10748AEb04B58e8F], 1000000000000000000, 755548, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000), (12, 0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000b875c000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b47997506000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000)]) [33m[delegatecall][0m
    │   │   ├─ [1462] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   ├─ [608] [32m0x7FFB3d637014488b63fb9858E279385685AFc1e2[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [55] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [38461] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteDelegateCall[0m(zeroEx/wethTransformer: [0xE309D011cC6F189A3e8DCBa85922715A019FED38], 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [34694] [32mzeroEx/wethTransformer[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [23977] [32mWrappedNativeToken[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ emit [36mDeposit[0m(_owner: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   └─ [32m← [0m0x13c9929e
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [83588] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteDelegateCall[0m(zeroEx/FillQuoteTransformer: [0xeD8932cA083E1eF1960dEa875A132926E6b242Ab], 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000380000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000b875c000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b47997506000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000) [33m[0m
    │   │   │   ├─ [82448] [32mzeroEx/FillQuoteTransformer[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000b875c000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b47997506000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [564] [32mWrappedNativeToken[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498]) [33m[staticcall][0m
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   │   ├─ [73476] [32mPolygonBridgeAdapter[0m::[32mtrade[0m((0x0000000000000000000000000000000200000000000000000000000000000000, 1000000000000000000, 755548, 0x0000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b47997506000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf1270000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f), WrappedNativeToken: [0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270], USDT: [0xc2132D05D31c914a87C6611C10748AEb04B58e8F], 1000000000000000000) [33m[delegatecall][0m
    │   │   │   │   │   ├─ [2750] [32mWrappedNativeToken[0m::[32mallowance[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], UniswapRouter: [0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506]) [33m[staticcall][0m
    │   │   │   │   │   │   └─ [32m← [0m0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
    │   │   │   │   │   ├─ [65599] [32mUniswapRouter[0m::[32mswapExactTokensForTokens[0m(1000000000000000000, 1, [0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270, 0xc2132D05D31c914a87C6611C10748AEb04B58e8F], zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 1663896527) [33m[0m
    │   │   │   │   │   │   ├─ [517] [32m0x55FF76BFFC3Cdd9D5FdbBC2ece4528ECcE45047e[0m::[32mgetReserves[0m() [33m[staticcall][0m
    │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000004bf87ac945510b0329200000000000000000000000000000000000000000000000000000003f4ddd9d300000000000000000000000000000000000000000000000000000000632d09b7
    │   │   │   │   │   │   ├─ [6609] [32mWrappedNativeToken[0m::[32mtransferFrom[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 0x55FF76BFFC3Cdd9D5FdbBC2ece4528ECcE45047e, 1000000000000000000) [33m[0m
    │   │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _to: 0x55FF76BFFC3Cdd9D5FdbBC2ece4528ECcE45047e, _value: 1000000000000000000)
    │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   ├─ [62120] [32m0x55FF76BFFC3Cdd9D5FdbBC2ece4528ECcE45047e[0m::[32mswap[0m(0, 755548, zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 0x) [33m[0m
    │   │   │   │   │   │   │   ├─ [31198] [32mUSDT[0m::[32mtransfer[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 755548) [33m[0m
    │   │   │   │   │   │   │   │   ├─ [30338] [32m0x7FFB3d637014488b63fb9858E279385685AFc1e2[0m::[32mtransfer[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 755548) [33m[delegatecall][0m
    │   │   │   │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: 0x55FF76BFFC3Cdd9D5FdbBC2ece4528ECcE45047e, _to: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _value: 755548)
    │   │   │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   │   ├─ [564] [32mWrappedNativeToken[0m::[32mbalanceOf[0m(0x55FF76BFFC3Cdd9D5FdbBC2ece4528ECcE45047e) [33m[staticcall][0m
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000004bf958d4b08b8143292
    │   │   │   │   │   │   │   ├─ [1462] [32mUSDT[0m::[32mbalanceOf[0m(0x55FF76BFFC3Cdd9D5FdbBC2ece4528ECcE45047e) [33m[staticcall][0m
    │   │   │   │   │   │   │   │   ├─ [608] [32m0x7FFB3d637014488b63fb9858E279385685AFc1e2[0m::[32mbalanceOf[0m(0x55FF76BFFC3Cdd9D5FdbBC2ece4528ECcE45047e) [33m[delegatecall][0m
    │   │   │   │   │   │   │   │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000003f4d25277
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000003f4d25277
    │   │   │   │   │   │   │   ├─ emit [36mSync[0m(: 22423570401541292831378, : 16992326263)
    │   │   │   │   │   │   │   ├─ emit [36mSwap[0m(param0: UniswapRouter: [0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506], param1: 1000000000000000000, param2: 0, param3: 0, param4: 755548, param5: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498])
    │   │   │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000b875c
    │   │   │   │   │   ├─ emit [36mBridgeFill[0m(source: 0x0000000000000000000000000000000200000000000000000000000000000000, inputToken: WrappedNativeToken: [0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270], outputToken: USDT: [0xc2132D05D31c914a87C6611C10748AEb04B58e8F], inputTokenAmount: 1000000000000000000, outputTokenAmount: 755548)
    │   │   │   │   │   └─ [32m← [0m755548
    │   │   │   │   └─ [32m← [0m0x13c9929e
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [1462] [32mUSDT[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498]) [33m[staticcall][0m
    │   │   │   ├─ [608] [32m0x7FFB3d637014488b63fb9858E279385685AFc1e2[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000000b875c
    │   │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000000b875c
    │   │   ├─ [20552] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteCall[0m(USDT: [0xc2132D05D31c914a87C6611C10748AEb04B58e8F], 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000b875c, 0) [33m[0m
    │   │   │   ├─ [19519] [32mUSDT[0m::[32mtransfer[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 755548) [33m[0m
    │   │   │   │   ├─ [18831] [32m0x7FFB3d637014488b63fb9858E279385685AFc1e2[0m::[32mtransfer[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 755548) [33m[delegatecall][0m
    │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _to: ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 755548)
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [1462] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   ├─ [608] [32m0x7FFB3d637014488b63fb9858E279385685AFc1e2[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000000b875c
    │   │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000000b875c
    │   │   ├─ emit [36mTransformedERC20[0m(taker: ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: USDT: [0xc2132D05D31c914a87C6611C10748AEb04B58e8F], inputTokenAmount: 1000000000000000000, outputTokenAmount: 755548)
    │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000000b875c
    │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000000b875c
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance before, val: 1000000000000000000)
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance before, val: 0)
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance after, val: 1000000000000000000)
    ├─ [1462] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   ├─ [608] [32m0x7FFB3d637014488b63fb9858E279385685AFc1e2[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000000b875c
    │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000000b875c
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance after, val: 755548)
    ├─ [1462] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   ├─ [608] [32m0x7FFB3d637014488b63fb9858E279385685AFc1e2[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000000b875c
    │   └─ [32m← [0m0x00000000000000000000000000000000000000000000000000000000000b875c
    ├─ [0] [34mVM[0m::[34mselectFork[0m(5) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: optimism)
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .10) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000da10009cbd5d07dd0cecc66161fc93d7c9000da10000000000000000000000007f5c764cbc14f9669b88837ca1490cca17c3160700000000000000000000000094b008aa00579c1307b0ef2c499ad98a8ce58e580000000000000000000000004200000000000000000000000000000000000006
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .10) [33m[0m
    │   └─ [34m← [0m0x00000000000000000000000055cf1d7535250db75bf0190493f55781ee583553000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004200000000000000000000000000000000000006000000000000000000000000def1abe32c034e558cdd535791643c58a13acc10000000000000000000000000a3128d9b7cca7d5af29780a56abeec12b05a67400000000000000000000000006d506b2847df0c6f04d2628da1adaf4d8fb2e81b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000003a539ed6bd42de8fbaf3899fb490c792e153d647000000000000000000000000845c75a791cceb1a451f4ca5778c011226dda95c000000000000000000000000085d10a34f14f6a631ea8ff7d016782ee3ffaa11000000000000000000000000b11e14565dfbeb702dea9bc0cb47f1a8b32f47830000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002ce7af6520e2862f961f5d7eda746642865179c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .10) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ emit [36mlog_named_string[0m(key:    Using contract addresses on chain, val: optimism)
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/affiliateFeeTransformer: [0x55Cf1D7535250dB75bF0190493F55781EE583553], zeroEx/affiliateFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/erc20BridgeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/erc20BridgeSampler) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0x4200000000000000000000000000000000000006], zeroEx/etherToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxy: [0xDEF1ABE32c034e558Cdd535791643C58a13aCC10], zeroEx/exchangeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyFlashWallet: [0xA3128d9b7Cca7d5Af29780a56abEec12B05a6740], zeroEx/exchangeProxyFlashWallet) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyGovernor: [0x6d506B2847DF0c6F04D2628Da1AdaF4D8Fb2e81B], zeroEx/exchangeProxyGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/exchangeProxyLiquidityProviderSandbox) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyTransformerDeployer: [0x3A539eD6bd42de8FBAf3899fb490c792e153D647], zeroEx/exchangeProxyTransformerDeployer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/fillQuoteTransformer: [0x845c75A791ccEb1A451f4ca5778C011226DDa95C], zeroEx/fillQuoteTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/payTakerTransformer: [0x085D10A34f14f6a631ea8ff7D016782Ee3ffaa11], zeroEx/payTakerTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/positiveSlippageFeeTransformer: [0xB11e14565dfBEb702DEA9BC0Cb47f1a8b32f4783], zeroEx/positiveSlippageFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/staking) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/stakingProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/wethTransformer: [0x02Ce7aF6520E2862F961f5D7Eda746642865179c], zeroEx/wethTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zeroExGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zrxToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zrxTreasury) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zrxVault) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0x4200000000000000000000000000000000000006], WrappedNativeToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDT: [0x94b008aA00579c1307B0EF2c499aD98a8ce58e58], USDT) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDC: [0x7F5c764cBc14f9669B88837ca1490cCa17c31607], USDC) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(DAI: [0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1], DAI) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], UniswapRouter) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .10) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000da10009cbd5d07dd0cecc66161fc93d7c9000da10000000000000000000000007f5c764cbc14f9669b88837ca1490cca17c3160700000000000000000000000094b008aa00579c1307b0ef2c499ad98a8ce58e580000000000000000000000004200000000000000000000000000000000000006
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .10) [33m[0m
    │   └─ [34m← [0m0x00000000000000000000000055cf1d7535250db75bf0190493f55781ee583553000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004200000000000000000000000000000000000006000000000000000000000000def1abe32c034e558cdd535791643c58a13acc10000000000000000000000000a3128d9b7cca7d5af29780a56abeec12b05a67400000000000000000000000006d506b2847df0c6f04d2628da1adaf4d8fb2e81b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000003a539ed6bd42de8fbaf3899fb490c792e153d647000000000000000000000000845c75a791cceb1a451f4ca5778c011226dda95c000000000000000000000000085d10a34f14f6a631ea8ff7d016782ee3ffaa11000000000000000000000000b11e14565dfbeb702dea9bc0cb47f1a8b32f47830000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002ce7af6520e2862f961f5d7eda746642865179c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .10) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ emit [36mlog_string[0m(:     Liquidity Source Not available on this chain)
    ├─ [0] [34mVM[0m::[34mselectFork[0m(6) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: arbitrum)
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .42161) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000da10009cbd5d07dd0cecc66161fc93d7c9000da1000000000000000000000000ff970a61a04b1ca14834a43f5de4533ebddb5cc8000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb900000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .42161) [33m[0m
    │   └─ [34m← [0m0x00000000000000000000000005a24978471869327904ea13da3c4322128e2aaa0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000db6f1920a889355780af7570773609bd8cb1f4980000000000000000000000001fe80d5ad9464dba2d60b88e449305f184823f8a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000029f80c1f685e19ae1807063eda432f431ac623d0000000000000000000000000466b00a77662245c2cc7b093a7102a687afc16f3000000000000000000000000ae3e8cf7bf340d7084f312dfae2aa8b01c885b02000000000000000000000000d56b9c014b45ed95e2a048a0c28121db30265f130000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010e968968f49dd66a5efeebbb2edcb9c49c4fc490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .42161) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b47997506
    ├─ emit [36mlog_named_string[0m(key:    Using contract addresses on chain, val: arbitrum)
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/affiliateFeeTransformer: [0x05A24978471869327904eA13DA3C4322128E2Aaa], zeroEx/affiliateFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/erc20BridgeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/erc20BridgeSampler) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0x82aF49447D8a07e3bd95BD0d56f35241523fBab1], zeroEx/etherToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF], zeroEx/exchangeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], zeroEx/exchangeProxyFlashWallet) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyGovernor: [0x1fe80d5Ad9464DBA2d60B88e449305F184823f8A], zeroEx/exchangeProxyGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/exchangeProxyLiquidityProviderSandbox) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyTransformerDeployer: [0x29f80c1f685e19aE1807063eDa432F431ac623D0], zeroEx/exchangeProxyTransformerDeployer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/fillQuoteTransformer: [0x466b00A77662245C2cC7b093A7102a687aFC16F3], zeroEx/fillQuoteTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/payTakerTransformer: [0xaE3E8cF7BF340d7084f312DfaE2aA8b01c885b02], zeroEx/payTakerTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/positiveSlippageFeeTransformer: [0xD56B9C014b45ED95e2a048A0C28121Db30265F13], zeroEx/positiveSlippageFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/staking) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/stakingProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/wethTransformer: [0x10e968968f49dd66a5eFEeBBb2edcB9c49c4fC49], zeroEx/wethTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zeroExGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zrxToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zrxTreasury) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], zeroEx/zrxVault) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0x82aF49447D8a07e3bd95BD0d56f35241523fBab1], WrappedNativeToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDT: [0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9], USDT) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDC: [0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8], USDC) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(DAI: [0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1], DAI) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(UniswapRouter: [0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506], UniswapRouter) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .42161) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000da10009cbd5d07dd0cecc66161fc93d7c9000da1000000000000000000000000ff970a61a04b1ca14834a43f5de4533ebddb5cc8000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb900000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .42161) [33m[0m
    │   └─ [34m← [0m0x00000000000000000000000005a24978471869327904ea13da3c4322128e2aaa0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff000000000000000000000000db6f1920a889355780af7570773609bd8cb1f4980000000000000000000000001fe80d5ad9464dba2d60b88e449305f184823f8a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000029f80c1f685e19ae1807063eda432f431ac623d0000000000000000000000000466b00a77662245c2cc7b093a7102a687afc16f3000000000000000000000000ae3e8cf7bf340d7084f312dfae2aa8b01c885b02000000000000000000000000d56b9c014b45ed95e2a048a0c28121db30265f130000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010e968968f49dd66a5efeebbb2edcb9c49c4fc490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .42161) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b47997506
    ├─ emit [36mlog_named_uint[0m(key:            WethTransformer nonce, val: 4)
    ├─ [0] [34mVM[0m::[34mstartPrank[0m(zeroEx/exchangeProxyTransformerDeployer: [0x29f80c1f685e19aE1807063eDa432F431ac623D0]) [33m[0m
    │   └─ [34m← [0m()
    ├─ [2446419] [33m→ [0m[33mnew[0m ArbitrumBridgeAdapter@0x24760A755a4ffe4E44f661336fD0dc646fd6F723
    │   └─ [32m← [0m12217 bytes of code
    ├─ [2227758] [33m→ [0m[33mnew[0m zeroEx/FillQuoteTransformer@0xC12d1eB39BcDE3a468959C929b50957f3a7F57F6
    │   └─ [32m← [0m11124 bytes of code
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/FillQuoteTransformer: [0xC12d1eB39BcDE3a468959C929b50957f3a7F57F6], zeroEx/FillQuoteTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mstopPrank[0m() [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_uint[0m(key:            FillQuoteTransformer nonce, val: 7)
    ├─ [359399] [33m→ [0m[33mnew[0m UniswapV2Sampler@0xf5a2fE45F4f1308502b1C136b9EF8af136141382
    │   └─ [32m← [0m1795 bytes of code
    ├─ [0] [34mVM[0m::[34mlabel[0m(UniswapV2Sampler: [0xf5a2fE45F4f1308502b1C136b9EF8af136141382], UniswapV2Sampler) [33m[0m
    │   └─ [34m← [0m()
    ├─ [14904] [32mUniswapV2Sampler[0m::[32msampleSellsFromUniswapV2[0m(UniswapRouter: [0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506], [0x82aF49447D8a07e3bd95BD0d56f35241523fBab1, 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9], [1000000000000000000]) [33m[staticcall][0m
    │   ├─ [8734] [32mUniswapRouter[0m::[32mgetAmountsOut[0m(1000000000000000000, [0x82aF49447D8a07e3bd95BD0d56f35241523fBab1, 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9]) [33m[staticcall][0m
    │   │   ├─ [2517] [32m0xCB0E5bFa72bBb4d16AB5aA0c60601c438F04b4ad[0m::[32mgetReserves[0m() [33m[staticcall][0m
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000026feb8a4f8989734d4000000000000000000000000000000000000000000000000000000a6e2d4cc0a0000000000000000000000000000000000000000000000000000000062addf7c
    │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000003b21e01c
    │   └─ [32m← [0m[992075804]
    ├─ emit [36mlog_string[0m(:        Sampling Uniswap for tokens)
    ├─ emit [36mlog_named_address[0m(key:         , val: WrappedNativeToken: [0x82aF49447D8a07e3bd95BD0d56f35241523fBab1])
    ├─ emit [36mlog_string[0m(:            -> )
    ├─ emit [36mlog_named_address[0m(key:         , val: USDT: [0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9])
    ├─ [0] [34mVM[0m::[34mdeal[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [9933] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   ├─ [2602] [32m0xf31e1AE27e7cd057C1D6795a5a083E0453D39B50[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [218046] [32mzeroEx/exchangeProxy[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, USDT: [0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9], 1000000000000000000, 992075804, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000), (7, 0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000003b21e01c000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b479975060000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000200000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000)]) [33m[0m
    │   ├─ [211861] [32m0x45Daa83b927ad02065B543DF26Aa03a6e4cF9952[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, USDT: [0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9], 1000000000000000000, 992075804, [(4, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000), (7, 0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000003b21e01c000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b479975060000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000200000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000)]) [33m[delegatecall][0m
    │   │   ├─ [1433] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   ├─ [602] [32m0xf31e1AE27e7cd057C1D6795a5a083E0453D39B50[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [55] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [51395] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteDelegateCall[0m(zeroEx/wethTransformer: [0x10e968968f49dd66a5eFEeBBb2edcB9c49c4fC49], 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [47628] [32mzeroEx/wethTransformer[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [36911] [32mWrappedNativeToken[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ [29674] [32m0x8b194bEae1d3e0788A1a35173978001ACDFba668[0m::[32mdeposit[0m() [33m[delegatecall][0m
    │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/zrxVault: [0x0000000000000000000000000000000000000000], _to: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _value: 1000000000000000000)
    │   │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   └─ [32m← [0m0x13c9929e
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [113643] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteDelegateCall[0m(zeroEx/FillQuoteTransformer: [0xC12d1eB39BcDE3a468959C929b50957f3a7F57F6], 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000003800000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000003b21e01c000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b479975060000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000200000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000) [33m[0m
    │   │   │   ├─ [112218] [32mzeroEx/FillQuoteTransformer[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000003b21e01c000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b479975060000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000200000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [1296] [32mWrappedNativeToken[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498]) [33m[staticcall][0m
    │   │   │   │   │   ├─ [553] [32m0x8b194bEae1d3e0788A1a35173978001ACDFba668[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498]) [33m[delegatecall][0m
    │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   │   ├─ [100271] [32mArbitrumBridgeAdapter[0m::[32mtrade[0m((0x0000000000000000000000000000000200000000000000000000000000000000, 1000000000000000000, 992075804, 0x0000000000000000000000001b02da8cb0d097eb8d57a175b88c7d8b479975060000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000200000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab1000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9), WrappedNativeToken: [0x82aF49447D8a07e3bd95BD0d56f35241523fBab1], USDT: [0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9], 1000000000000000000) [33m[delegatecall][0m
    │   │   │   │   │   ├─ [3428] [32mWrappedNativeToken[0m::[32mallowance[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], UniswapRouter: [0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506]) [33m[staticcall][0m
    │   │   │   │   │   │   ├─ [2682] [32m0x8b194bEae1d3e0788A1a35173978001ACDFba668[0m::[32mallowance[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], UniswapRouter: [0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506]) [33m[delegatecall][0m
    │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   │   │   │   ├─ [23208] [32mWrappedNativeToken[0m::[32mapprove[0m(UniswapRouter: [0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506], 115792089237316195423570985008687907853269984665640564039457584007913129639935) [33m[0m
    │   │   │   │   │   │   ├─ [22462] [32m0x8b194bEae1d3e0788A1a35173978001ACDFba668[0m::[32mapprove[0m(UniswapRouter: [0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506], 115792089237316195423570985008687907853269984665640564039457584007913129639935) [33m[delegatecall][0m
    │   │   │   │   │   │   │   ├─ emit [36mApproval[0m(_owner: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _spender: UniswapRouter: [0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506], _value: 115792089237316195423570985008687907853269984665640564039457584007913129639935)
    │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   ├─ [70285] [32mUniswapRouter[0m::[32mswapExactTokensForTokens[0m(1000000000000000000, 1, [0x82aF49447D8a07e3bd95BD0d56f35241523fBab1, 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9], zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 1655562157) [33m[0m
    │   │   │   │   │   │   ├─ [517] [32m0xCB0E5bFa72bBb4d16AB5aA0c60601c438F04b4ad[0m::[32mgetReserves[0m() [33m[staticcall][0m
    │   │   │   │   │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000026feb8a4f8989734d4000000000000000000000000000000000000000000000000000000a6e2d4cc0a0000000000000000000000000000000000000000000000000000000062addf7c
    │   │   │   │   │   │   ├─ [9344] [32mWrappedNativeToken[0m::[32mtransferFrom[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 0xCB0E5bFa72bBb4d16AB5aA0c60601c438F04b4ad, 1000000000000000000) [33m[0m
    │   │   │   │   │   │   │   ├─ [8743] [32m0x8b194bEae1d3e0788A1a35173978001ACDFba668[0m::[32mtransferFrom[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 0xCB0E5bFa72bBb4d16AB5aA0c60601c438F04b4ad, 1000000000000000000) [33m[delegatecall][0m
    │   │   │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _to: 0xCB0E5bFa72bBb4d16AB5aA0c60601c438F04b4ad, _value: 1000000000000000000)
    │   │   │   │   │   │   │   │   ├─ emit [36mApproval[0m(_owner: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _spender: UniswapRouter: [0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506], _value: 115792089237316195423570985008687907853269984665640564039456584007913129639935)
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   ├─ [64559] [32m0xCB0E5bFa72bBb4d16AB5aA0c60601c438F04b4ad[0m::[32mswap[0m(0, 992075804, zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 0x) [33m[0m
    │   │   │   │   │   │   │   ├─ [32934] [32mUSDT[0m::[32mtransfer[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 992075804) [33m[0m
    │   │   │   │   │   │   │   │   ├─ [32100] [32m0xf31e1AE27e7cd057C1D6795a5a083E0453D39B50[0m::[32mtransfer[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], 992075804) [33m[delegatecall][0m
    │   │   │   │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: 0xCB0E5bFa72bBb4d16AB5aA0c60601c438F04b4ad, _to: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _value: 992075804)
    │   │   │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   │   ├─ [1296] [32mWrappedNativeToken[0m::[32mbalanceOf[0m(0xCB0E5bFa72bBb4d16AB5aA0c60601c438F04b4ad) [33m[staticcall][0m
    │   │   │   │   │   │   │   │   ├─ [553] [32m0x8b194bEae1d3e0788A1a35173978001ACDFba668[0m::[32mbalanceOf[0m(0xCB0E5bFa72bBb4d16AB5aA0c60601c438F04b4ad) [33m[delegatecall][0m
    │   │   │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000270c995bac3ffb34d4
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000270c995bac3ffb34d4
    │   │   │   │   │   │   │   ├─ [1433] [32mUSDT[0m::[32mbalanceOf[0m(0xCB0E5bFa72bBb4d16AB5aA0c60601c438F04b4ad) [33m[staticcall][0m
    │   │   │   │   │   │   │   │   ├─ [602] [32m0xf31e1AE27e7cd057C1D6795a5a083E0453D39B50[0m::[32mbalanceOf[0m(0xCB0E5bFa72bBb4d16AB5aA0c60601c438F04b4ad) [33m[delegatecall][0m
    │   │   │   │   │   │   │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000a6a7b2ebee
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000a6a7b2ebee
    │   │   │   │   │   │   │   ├─ emit [36mSync[0m(: 720330876469930308820, : 715778092014)
    │   │   │   │   │   │   │   ├─ emit [36mSwap[0m(param0: UniswapRouter: [0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506], param1: 1000000000000000000, param2: 0, param3: 0, param4: 992075804, param5: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498])
    │   │   │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000003b21e01c
    │   │   │   │   │   ├─ emit [36mBridgeFill[0m(source: 0x0000000000000000000000000000000200000000000000000000000000000000, inputToken: WrappedNativeToken: [0x82aF49447D8a07e3bd95BD0d56f35241523fBab1], outputToken: USDT: [0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9], inputTokenAmount: 1000000000000000000, outputTokenAmount: 992075804)
    │   │   │   │   │   └─ [32m← [0m992075804
    │   │   │   │   └─ [32m← [0m0x13c9929e
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [1433] [32mUSDT[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498]) [33m[staticcall][0m
    │   │   │   ├─ [602] [32m0xf31e1AE27e7cd057C1D6795a5a083E0453D39B50[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000003b21e01c
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000003b21e01c
    │   │   ├─ [21940] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteCall[0m(USDT: [0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9], 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000000000000000000000000000000000003b21e01c, 0) [33m[0m
    │   │   │   ├─ [20908] [32mUSDT[0m::[32mtransfer[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 992075804) [33m[0m
    │   │   │   │   ├─ [20240] [32m0xf31e1AE27e7cd057C1D6795a5a083E0453D39B50[0m::[32mtransfer[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 992075804) [33m[delegatecall][0m
    │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/exchangeProxyFlashWallet: [0xdB6f1920A889355780aF7570773609Bd8Cb1f498], _to: ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 992075804)
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [1433] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   ├─ [602] [32m0xf31e1AE27e7cd057C1D6795a5a083E0453D39B50[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000003b21e01c
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000003b21e01c
    │   │   ├─ emit [36mTransformedERC20[0m(taker: ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: USDT: [0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9], inputTokenAmount: 1000000000000000000, outputTokenAmount: 992075804)
    │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000003b21e01c
    │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000003b21e01c
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance before, val: 1000000000000000000)
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance before, val: 0)
    ├─ emit [36mlog_named_uint[0m(key:         NativeAsset balance after, val: 1000000000000000000)
    ├─ [1433] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   ├─ [602] [32m0xf31e1AE27e7cd057C1D6795a5a083E0453D39B50[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000003b21e01c
    │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000003b21e01c
    ├─ emit [36mlog_named_uint[0m(key:         ERC-20 balance after, val: 992075804)
    ├─ [1433] [32mUSDT[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   ├─ [602] [32m0xf31e1AE27e7cd057C1D6795a5a083E0453D39B50[0m::[32mbalanceOf[0m(ETHToERC20TransformTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000003b21e01c
    │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000003b21e01c
    └─ [32m← [0m()

Test result: [32mok[0m. 1 passed; 0 failed; finished in 5.38s

Running 1 test for contracts/test/foundry/OtcOrderTestsWithBridge.sol:NativeTokenToERC20WithOtcTest
[32m[PASS][0m testSwapEthForUSDTThroughFqtOtcs() (gas: 17173027)
Logs:
  SwapEthForUSDTThroughFqtOtc
    Selecting Fork On: mainnet
     Using contract addresses on chain: mainnet
             WethTransformer nonce: 6
             FillQuoteTransformer nonce: 26
  WARNING: Test tip(address,address,uint256): The `tip` stdcheat has been deprecated. Use `deal` instead.
          Successful fill, makerTokens bought

Traces:
  [17173027] [32mNativeTokenToERC20WithOtcTest[0m::[32mtestSwapEthForUSDTThroughFqtOtcs[0m() [33m[0m
    ├─ emit [36mlog_string[0m(: SwapEthForUSDTThroughFqtOtc)
    ├─ [0] [34mVM[0m::[34mselectFork[0m(0) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: mainnet)
    ├─ [0] [34mVM[0m::[34mdeal[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000da6d9fc5998f550a094585cf9171f0e8ee3ac59f0000000000000000000000008ed95d1746bf1e4dab58d8ed4724f1ef95b20db0000000000000000000000000d8c38704c9937ea3312de29f824b4ad3450a5e61000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18000000000000000000000000618f9c67ce7bf1a50afa1e7e0238422601b0ff6e000000000000000000000000407b4128e9ecad8769b2332312a9f655cb9f5f3a00000000000000000000000039dce47a67ad34344eab877eae3ef1fa2a1d50bb000000000000000000000000d75a9019a2a1782ea670e4f4a55f04b43514ed530000000000000000000000004638a7ebe75b911b995d0ec73a81e4f85f41f24e000000000000000000000000a9416ce1dbde8d331210c07b5c253d94ee4cc3fd0000000000000000000000002a17c35ff147b32f13f19f2e311446eeb02503f3000000000000000000000000a26e80e7dea86279c6d778d702cc413e6cffa777000000000000000000000000b2bc06a4efb20fc6553a69dbfa49b7be938034a70000000000000000000000007d3455421bbc5ed534a83c88fd80387dc8271392000000000000000000000000e41d2489571d322189246dafa5ebde1f4699f4980000000000000000000000000bb1810061c2f5b2088054ee184e6c79e1591101000000000000000000000000ba7f8b5fb1b19c1211c5d49550fcd149177a5eaf
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000f164fc0ec4e93095b804a4795bbe1e041497b92a
    ├─ emit [36mlog_named_string[0m(key:    Using contract addresses on chain, val: mainnet)
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/affiliateFeeTransformer: [0xdA6D9FC5998f550a094585cf9171f0E8eE3Ac59F], zeroEx/affiliateFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/erc20BridgeProxy: [0x8ED95d1746bf1E4dAb58d8ED4724f1Ef95B20Db0], zeroEx/erc20BridgeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/erc20BridgeSampler: [0xD8C38704c9937eA3312De29F824b4AD3450a5e61], zeroEx/erc20BridgeSampler) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2], zeroEx/etherToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF], zeroEx/exchangeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], zeroEx/exchangeProxyFlashWallet) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyGovernor: [0x618F9C67CE7Bf1a50afa1E7e0238422601b0ff6e], zeroEx/exchangeProxyGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyLiquidityProviderSandbox: [0x407B4128E9eCaD8769B2332312a9F655cB9F5F3A], zeroEx/exchangeProxyLiquidityProviderSandbox) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyTransformerDeployer: [0x39dCe47a67aD34344EAB877eaE3Ef1FA2a1d50Bb], zeroEx/exchangeProxyTransformerDeployer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/fillQuoteTransformer: [0xd75A9019a2A1782Ea670e4F4a55f04B43514ed53], zeroEx/fillQuoteTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/payTakerTransformer: [0x4638A7Ebe75b911B995D0ec73a81E4f85F41F24E], zeroEx/payTakerTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/positiveSlippageFeeTransformer: [0xA9416Ce1dBDE8D331210C07B5C253D94ee4cC3Fd], zeroEx/positiveSlippageFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/staking: [0x2a17c35FF147b32f13F19F2E311446eEB02503F3], zeroEx/staking) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/stakingProxy: [0xa26e80e7Dea86279c6d778D702Cc413E6CFfA777], zeroEx/stakingProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/wethTransformer: [0xb2bc06a4EfB20FC6553a69Dbfa49B7bE938034A7], zeroEx/wethTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zeroExGovernor: [0x7D3455421BbC5Ed534a83c88FD80387dc8271392], zeroEx/zeroExGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxToken: [0xE41d2489571d322189246DaFA5ebDe1F4699F498], zeroEx/zrxToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxTreasury: [0x0bB1810061C2f5b2088054eE184E6C79e1591101], zeroEx/zrxTreasury) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0xBa7f8b5fB1b19c1211c5d49550fcD149177A5Eaf], zeroEx/zrxVault) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2], WrappedNativeToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDT: [0xdAC17F958D2ee523a2206206994597C13D831ec7], USDT) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], USDC) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(DAI: [0x6B175474E89094C44Da98b954EedeAC495271d0F], DAI) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(UniswapRouter: [0xf164fC0Ec4E93095b804a4795bBe1e041497b92a], UniswapRouter) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000da6d9fc5998f550a094585cf9171f0e8ee3ac59f0000000000000000000000008ed95d1746bf1e4dab58d8ed4724f1ef95b20db0000000000000000000000000d8c38704c9937ea3312de29f824b4ad3450a5e61000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18000000000000000000000000618f9c67ce7bf1a50afa1e7e0238422601b0ff6e000000000000000000000000407b4128e9ecad8769b2332312a9f655cb9f5f3a00000000000000000000000039dce47a67ad34344eab877eae3ef1fa2a1d50bb000000000000000000000000d75a9019a2a1782ea670e4f4a55f04b43514ed530000000000000000000000004638a7ebe75b911b995d0ec73a81e4f85f41f24e000000000000000000000000a9416ce1dbde8d331210c07b5c253d94ee4cc3fd0000000000000000000000002a17c35ff147b32f13f19f2e311446eeb02503f3000000000000000000000000a26e80e7dea86279c6d778d702cc413e6cffa777000000000000000000000000b2bc06a4efb20fc6553a69dbfa49b7be938034a70000000000000000000000007d3455421bbc5ed534a83c88fd80387dc8271392000000000000000000000000e41d2489571d322189246dafa5ebde1f4699f4980000000000000000000000000bb1810061c2f5b2088054ee184e6c79e1591101000000000000000000000000ba7f8b5fb1b19c1211c5d49550fcd149177a5eaf
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000f164fc0ec4e93095b804a4795bbe1e041497b92a
    ├─ emit [36mlog_named_uint[0m(key:            WethTransformer nonce, val: 6)
    ├─ [0] [34mVM[0m::[34mstartPrank[0m(zeroEx/exchangeProxyTransformerDeployer: [0x39dCe47a67aD34344EAB877eaE3Ef1FA2a1d50Bb]) [33m[0m
    │   └─ [34m← [0m()
    ├─ [4882116] [33m→ [0m[33mnew[0m zeroEx/fillQuoteTransformer@0xd75A9019a2A1782Ea670e4F4a55f04B43514ed53
    │   └─ [32m← [0m24378 bytes of code
    ├─ [2232965] [33m→ [0m[33mnew[0m zeroEx/FillQuoteTransformer@0xd8E10b0689d0B2f28136777635caA4AbD2bB9F04
    │   └─ [32m← [0m11150 bytes of code
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/FillQuoteTransformer: [0xd8E10b0689d0B2f28136777635caA4AbD2bB9F04], zeroEx/FillQuoteTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mstopPrank[0m() [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_uint[0m(key:            FillQuoteTransformer nonce, val: 26)
    ├─ [0] [34mVM[0m::[34mderiveKey[0m(<pk>) [33m[0m
    │   └─ [34m← [0m<pk>
    ├─ [0] [34mVM[0m::[34maddr[0m(<pk>) [33m[0m
    │   └─ [34m← [0mzeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], zeroEx/MarketMaker) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34maddr[0m(<pk>) [33m[0m
    │   └─ [34m← [0mzeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]
    ├─ emit [36mlog_named_string[0m(key: WARNING, val: Test tip(address,address,uint256): The `tip` stdcheat has been deprecated. Use `deal` instead.)
    ├─ [0] [34mVM[0m::[34mrecord[0m() [33m[0m
    │   └─ [34m← [0m()
    ├─ [9815] [32mUSDC[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[staticcall][0m
    │   ├─ [2529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34maccesses[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48]) [33m[0m
    │   └─ [34m← [0m[0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b, 0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3, 0xcb8911fb82c2d10f6cf1d31d1e521ad3f4e3f42615f6ba67c454a9a2fdb9b6a7], []
    ├─ [0] [34mVM[0m::[34mload[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000807a96288a1a408dbc13de2b1d087d10356395d2
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b, 0x1337000000000000000000000000000000000000000000000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [1315] [32mUSDC[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[staticcall][0m
    │   ├─ [529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b, 0x000000000000000000000000807a96288a1a408dbc13de2b1d087d10356395d2) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mload[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000a2327a938febf5fec13bacfb16ae10ecbc4cbdcf
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3, 0x1337000000000000000000000000000000000000000000000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [3283] [32mUSDC[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[staticcall][0m
    │   ├─ [0] [32m0x0000000000000000000000000000000000000000[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m()
    │   └─ [32m← [0m()
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3, 0x000000000000000000000000a2327a938febf5fec13bacfb16ae10ecbc4cbdcf) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mload[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0xcb8911fb82c2d10f6cf1d31d1e521ad3f4e3f42615f6ba67c454a9a2fdb9b6a7) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ emit [36mWARNING_UninitedSlot[0m(who: USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], slot: 92061690420682965222154294547751512818492351710878667848452063211835425928871)
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0xcb8911fb82c2d10f6cf1d31d1e521ad3f4e3f42615f6ba67c454a9a2fdb9b6a7, 0x1337000000000000000000000000000000000000000000000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [1315] [32mUSDC[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[staticcall][0m
    │   ├─ [529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x1337000000000000000000000000000000000000000000000000000000000000
    │   └─ [32m← [0m0x1337000000000000000000000000000000000000000000000000000000000000
    ├─ emit [36mSlotFound[0m(who: USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], fsig: 0x70a08231, keysHash: 0x723077b8a1b173adc35e5f0e7e3662fd1208212cb629f9c128551ea7168da722, slot: 92061690420682965222154294547751512818492351710878667848452063211835425928871)
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0xcb8911fb82c2d10f6cf1d31d1e521ad3f4e3f42615f6ba67c454a9a2fdb9b6a7, 0x0000000000000000000000000000000000000000000000000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [1315] [32mUSDC[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[staticcall][0m
    │   ├─ [529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mload[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0xcb8911fb82c2d10f6cf1d31d1e521ad3f4e3f42615f6ba67c454a9a2fdb9b6a7) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0xcb8911fb82c2d10f6cf1d31d1e521ad3f4e3f42615f6ba67c454a9a2fdb9b6a7, 0x0000000000000000000000000000000000000000000000056bc75e2d63100000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mprank[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[0m
    │   └─ [34m← [0m()
    ├─ [31867] [32mUSDC[0m::[32mapprove[0m(zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF], 100000000000000000000) [33m[0m
    │   ├─ [31078] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mapprove[0m(zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF], 100000000000000000000) [33m[delegatecall][0m
    │   │   ├─ emit [36mApproval[0m(_owner: zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], _spender: zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF], _value: 100000000000000000000)
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    ├─ [0] [34mVM[0m::[34mprank[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mgetNonce[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[0m
    │   └─ [34m← [0m0x00000000000000000000000000000000000000000000000000000000000000da
    ├─ [7699] [32mzeroEx/exchangeProxy[0m::[32mgetOtcOrderHash[0m((0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 1000000000000000000, 1000000000000000000, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 0x0000000000000000000000000000000000000000, 0x00a329c0648769A73afAc7F9381E08FB43dBEA72, 10393490849018163441524569317769385871874303876584145705395311083738)) [33m[staticcall][0m
    │   ├─ [1957] [32m0x5Ebac8dbfbBA22168471b0f914131d1976536A25[0m::[32mgetOtcOrderHash[0m((0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 1000000000000000000, 1000000000000000000, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 0x0000000000000000000000000000000000000000, 0x00a329c0648769A73afAc7F9381E08FB43dBEA72, 10393490849018163441524569317769385871874303876584145705395311083738)) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x7a3855e6d3f929ec08fbd4c27f8f5e3cdd05ad2748e49f754f666d2cfdc86eb9
    │   └─ [32m← [0m0x7a3855e6d3f929ec08fbd4c27f8f5e3cdd05ad2748e49f754f666d2cfdc86eb9
    ├─ [0] [34mVM[0m::[34msign[0m(<pk>, 0x7a3855e6d3f929ec08fbd4c27f8f5e3cdd05ad2748e49f754f666d2cfdc86eb9) [33m[0m
    │   └─ [34m← [0m28, 0x985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de, 0x785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a
    ├─ emit [36mlog_string[0m(:         Successful fill, makerTokens bought)
    ├─ [182337] [32mzeroEx/exchangeProxy[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 1000000000000000000, 1000000000000000000, [(6, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000), (26, 0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000003600000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a329c0648769a73afac7f9381e08fb43dbea720000000062b12d3c0000000000000000000000000000000000000000000000da0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001c985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003)]) [33m[0m
    │   ├─ [176121] [32m0x44A6999Ec971cfCA458AFf25A808F272f6d492A2[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 1000000000000000000, 1000000000000000000, [(6, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000), (26, 0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000003600000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a329c0648769a73afac7f9381e08fb43dbea720000000062b12d3c0000000000000000000000000000000000000000000000da0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001c985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003)]) [33m[delegatecall][0m
    │   │   ├─ [3315] [32mUSDC[0m::[32mbalanceOf[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   ├─ [2529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [55] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [38458] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteDelegateCall[0m(zeroEx/wethTransformer: [0xb2bc06a4EfB20FC6553a69Dbfa49B7bE938034A7], 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [34691] [32mzeroEx/wethTransformer[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [23974] [32mWrappedNativeToken[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ emit [36mDeposit[0m(_owner: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   └─ [32m← [0m0x13c9929e00000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [88222] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteDelegateCall[0m(zeroEx/FillQuoteTransformer: [0xd8E10b0689d0B2f28136777635caA4AbD2bB9F04], 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000003c000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000003600000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a329c0648769a73afac7f9381e08fb43dbea720000000062b12d3c0000000000000000000000000000000000000000000000da0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001c985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003) [33m[0m
    │   │   │   ├─ [86784] [32mzeroEx/FillQuoteTransformer[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000003600000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a329c0648769a73afac7f9381e08fb43dbea720000000062b12d3c0000000000000000000000000000000000000000000000da0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001c985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003)) [33m[delegatecall][0m
    │   │   │   │   ├─ [534] [32mWrappedNativeToken[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18]) [33m[staticcall][0m
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   │   ├─ [2717] [32mWrappedNativeToken[0m::[32mallowance[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF]) [33m[staticcall][0m
    │   │   │   │   │   └─ [32m← [0m0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
    │   │   │   │   ├─ [73688] [32mzeroEx/exchangeProxy[0m::[32mfillOtcOrder[0m((0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 1000000000000000000, 1000000000000000000, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 0x0000000000000000000000000000000000000000, 0x00a329c0648769A73afAc7F9381E08FB43dBEA72, 10393490849018163441524569317769385871874303876584145705395311083738), (2, 28, 0x985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de, 0x785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a), 1000000000000000000) [33m[0m
    │   │   │   │   │   ├─ [71044] [32m0x5Ebac8dbfbBA22168471b0f914131d1976536A25[0m::[32mfillOtcOrder[0m((0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 1000000000000000000, 1000000000000000000, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 0x0000000000000000000000000000000000000000, 0x00a329c0648769A73afAc7F9381E08FB43dBEA72, 10393490849018163441524569317769385871874303876584145705395311083738), (2, 28, 0x985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de, 0x785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a), 1000000000000000000) [33m[delegatecall][0m
    │   │   │   │   │   │   ├─ [3000] [32mPRECOMPILE[0m::[32mecrecover[0m(0x7a3855e6d3f929ec08fbd4c27f8f5e3cdd05ad2748e49f754f666d2cfdc86eb9, 28, 68915804246868677132714824533369331124120471227733621717400712857659560421342, 54437070250299770118796847148919531396969764170984633592968507377364226457722) [33m[staticcall][0m
    │   │   │   │   │   │   │   └─ [32m← [0mzeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]
    │   │   │   │   │   │   ├─ [20260] [32mWrappedNativeToken[0m::[32mtransferFrom[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], 1000000000000000000) [33m[0m
    │   │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], _to: zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], _value: 1000000000000000000)
    │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   ├─ [29892] [32mUSDC[0m::[32mtransferFrom[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], 1000000000000000000) [33m[0m
    │   │   │   │   │   │   │   ├─ [29097] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mtransferFrom[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], 1000000000000000000) [33m[delegatecall][0m
    │   │   │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], _to: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], _value: 1000000000000000000)
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   ├─ emit [36mOtcOrderFilled[0m(orderHash: 0x7a3855e6d3f929ec08fbd4c27f8f5e3cdd05ad2748e49f754f666d2cfdc86eb9, maker: zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], taker: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], makerToken: USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], takerToken: WrappedNativeToken: [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2], makerTokenFilledAmount: 1000000000000000000, takerTokenFilledAmount: 1000000000000000000)
    │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   │   └─ [32m← [0m0x13c9929e00000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [1315] [32mUSDC[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18]) [33m[staticcall][0m
    │   │   │   ├─ [529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ [22407] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteCall[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e840000000000000000000000000000000000000000000000000de0b6b3a7640000, 0) [33m[0m
    │   │   │   ├─ [21374] [32mUSDC[0m::[32mtransfer[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   │   │   │   ├─ [20743] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mtransfer[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[delegatecall][0m
    │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], _to: NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [1315] [32mUSDC[0m::[32mbalanceOf[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   ├─ [529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ emit [36mTransformedERC20[0m(taker: NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], inputTokenAmount: 1000000000000000000, outputTokenAmount: 1000000000000000000)
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ [1315] [32mUSDC[0m::[32mbalanceOf[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   ├─ [529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    └─ [32m← [0m()

Test result: [32mok[0m. 1 passed; 0 failed; finished in 5.57s

Running 1 test for contracts/test/foundry/OtcOrderTests.sol:NativeTokenToERC20WithOtcTest
[32m[PASS][0m testSwapEthForUSDTThroughFqtOtcs() (gas: 17173027)
Logs:
  SwapEthForUSDTThroughFqtOtc
    Selecting Fork On: mainnet
     Using contract addresses on chain: mainnet
             WethTransformer nonce: 6
             FillQuoteTransformer nonce: 26
  WARNING: Test tip(address,address,uint256): The `tip` stdcheat has been deprecated. Use `deal` instead.
          Successful fill, makerTokens bought

Traces:
  [17173027] [32mNativeTokenToERC20WithOtcTest[0m::[32mtestSwapEthForUSDTThroughFqtOtcs[0m() [33m[0m
    ├─ emit [36mlog_string[0m(: SwapEthForUSDTThroughFqtOtc)
    ├─ [0] [34mVM[0m::[34mselectFork[0m(0) [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_string[0m(key:   Selecting Fork On, val: mainnet)
    ├─ [0] [34mVM[0m::[34mdeal[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000da6d9fc5998f550a094585cf9171f0e8ee3ac59f0000000000000000000000008ed95d1746bf1e4dab58d8ed4724f1ef95b20db0000000000000000000000000d8c38704c9937ea3312de29f824b4ad3450a5e61000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18000000000000000000000000618f9c67ce7bf1a50afa1e7e0238422601b0ff6e000000000000000000000000407b4128e9ecad8769b2332312a9f655cb9f5f3a00000000000000000000000039dce47a67ad34344eab877eae3ef1fa2a1d50bb000000000000000000000000d75a9019a2a1782ea670e4f4a55f04b43514ed530000000000000000000000004638a7ebe75b911b995d0ec73a81e4f85f41f24e000000000000000000000000a9416ce1dbde8d331210c07b5c253d94ee4cc3fd0000000000000000000000002a17c35ff147b32f13f19f2e311446eeb02503f3000000000000000000000000a26e80e7dea86279c6d778d702cc413e6cffa777000000000000000000000000b2bc06a4efb20fc6553a69dbfa49b7be938034a70000000000000000000000007d3455421bbc5ed534a83c88fd80387dc8271392000000000000000000000000e41d2489571d322189246dafa5ebde1f4699f4980000000000000000000000000bb1810061c2f5b2088054ee184e6c79e1591101000000000000000000000000ba7f8b5fb1b19c1211c5d49550fcd149177a5eaf
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000f164fc0ec4e93095b804a4795bbe1e041497b92a
    ├─ emit [36mlog_named_string[0m(key:    Using contract addresses on chain, val: mainnet)
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/affiliateFeeTransformer: [0xdA6D9FC5998f550a094585cf9171f0E8eE3Ac59F], zeroEx/affiliateFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/erc20BridgeProxy: [0x8ED95d1746bf1E4dAb58d8ED4724f1Ef95B20Db0], zeroEx/erc20BridgeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/erc20BridgeSampler: [0xD8C38704c9937eA3312De29F824b4AD3450a5e61], zeroEx/erc20BridgeSampler) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2], zeroEx/etherToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF], zeroEx/exchangeProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], zeroEx/exchangeProxyFlashWallet) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyGovernor: [0x618F9C67CE7Bf1a50afa1E7e0238422601b0ff6e], zeroEx/exchangeProxyGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyLiquidityProviderSandbox: [0x407B4128E9eCaD8769B2332312a9F655cB9F5F3A], zeroEx/exchangeProxyLiquidityProviderSandbox) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/exchangeProxyTransformerDeployer: [0x39dCe47a67aD34344EAB877eaE3Ef1FA2a1d50Bb], zeroEx/exchangeProxyTransformerDeployer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/fillQuoteTransformer: [0xd75A9019a2A1782Ea670e4F4a55f04B43514ed53], zeroEx/fillQuoteTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/payTakerTransformer: [0x4638A7Ebe75b911B995D0ec73a81E4f85F41F24E], zeroEx/payTakerTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/positiveSlippageFeeTransformer: [0xA9416Ce1dBDE8D331210C07B5C253D94ee4cC3Fd], zeroEx/positiveSlippageFeeTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/staking: [0x2a17c35FF147b32f13F19F2E311446eEB02503F3], zeroEx/staking) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/stakingProxy: [0xa26e80e7Dea86279c6d778D702Cc413E6CFfA777], zeroEx/stakingProxy) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/wethTransformer: [0xb2bc06a4EfB20FC6553a69Dbfa49B7bE938034A7], zeroEx/wethTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zeroExGovernor: [0x7D3455421BbC5Ed534a83c88FD80387dc8271392], zeroEx/zeroExGovernor) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxToken: [0xE41d2489571d322189246DaFA5ebDe1F4699F498], zeroEx/zrxToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxTreasury: [0x0bB1810061C2f5b2088054eE184E6C79e1591101], zeroEx/zrxTreasury) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/zrxVault: [0xBa7f8b5fB1b19c1211c5d49550fcD149177A5Eaf], zeroEx/zrxVault) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(WrappedNativeToken: [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2], WrappedNativeToken) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDT: [0xdAC17F958D2ee523a2206206994597C13D831ec7], USDT) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], USDC) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(DAI: [0x6B175474E89094C44Da98b954EedeAC495271d0F], DAI) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mlabel[0m(UniswapRouter: [0xf164fC0Ec4E93095b804a4795bBe1e041497b92a], UniswapRouter) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/tokenAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "WrappedNativeToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
        "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7"
    },
    "56": {
        "WrappedNativeToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "DAI": "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
        "USDC": "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        "USDT": "0x55d398326f99059ff775485246999027b3197955"
    },
    "137": {
        "WrappedNativeToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "DAI": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        "USDC": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
        "USDT": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f"
    },
    "43114": {
        "WrappedNativeToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "DAI": "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
        "USDC": "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
        "USDT": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118"
    },
    "250": {
        "WrappedNativeToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "DAI": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
        "USDC": "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
        "USDT": "0x049d68029688eabf473097a2fc38ef61633a3c7a"
    },
    "10": {
        "WrappedNativeToken": "0x4200000000000000000000000000000000000006",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
        "USDT": "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"
    },
    "42161": {
        "WrappedNativeToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "DAI": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        "USDC": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        "USDT": "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/addresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "zrxToken": "0xe41d2489571d322189246dafa5ebde1f4699f498",
        "etherToken": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "zeroExGovernor": "0x7d3455421bbc5ed534a83c88fd80387dc8271392",
        "zrxVault": "0xba7f8b5fb1b19c1211c5d49550fcd149177a5eaf",
        "staking": "0x2a17c35ff147b32f13f19f2e311446eeb02503f3",
        "stakingProxy": "0xa26e80e7dea86279c6d778d702cc413e6cffa777",
        "erc20BridgeProxy": "0x8ed95d1746bf1e4dab58d8ed4724f1ef95b20db0",
        "erc20BridgeSampler": "0xd8c38704c9937ea3312de29f824b4ad3450a5e61",
        "exchangeProxyGovernor": "0x618f9c67ce7bf1a50afa1e7e0238422601b0ff6e",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x39dce47a67ad34344eab877eae3ef1fa2a1d50bb",
        "exchangeProxyFlashWallet": "0x22f9dcf4647084d6c31b2765f6910cd85c178c18",
        "exchangeProxyLiquidityProviderSandbox": "0x407b4128e9ecad8769b2332312a9f655cb9f5f3a",
        "zrxTreasury": "0x0bb1810061c2f5b2088054ee184e6c79e1591101",
        "wethTransformer": "0xb2bc06a4efb20fc6553a69dbfa49b7be938034a7",
        "payTakerTransformer": "0x4638a7ebe75b911b995d0ec73a81e4f85f41f24e",
        "affiliateFeeTransformer": "0xda6d9fc5998f550a094585cf9171f0e8ee3ac59f",
        "fillQuoteTransformer": "0xd75a9019a2a1782ea670e4f4a55f04b43514ed53",
        "positiveSlippageFeeTransformer": "0xa9416ce1dbde8d331210c07b5c253d94ee4cc3fd"
    },
    "56": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xccc9769c1a58766e79423a34b2cc5052d65c1983",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x8224aa8fe5c9f07d5a59c735386ff6cc6aaeb568",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0xde7b2747624a647600fdb349184d0448ab954929",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xac3d95668c092e895cd83a9cbafe9c7d9906471f",
        "payTakerTransformer": "0x4f5e8ca2cadecd4a467ae441e4b03de4278a4574",
        "affiliateFeeTransformer": "0x1be34ab9b2acb5c4ddd89454bdce637967e65230",
        "fillQuoteTransformer": "0xbd7fd6e116fc8589bb658fba3a2cc6273050bcf2",
        "positiveSlippageFeeTransformer": "0x7f5c79ad1788573b1145f4651a248523c54f5d1f"
    },
    "137": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x4d3e56c56a55d23fc7aa9a9ffad61631cf7d1ae6",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xe6d9207df11c55bce2f7a189ae95e3222d5484d3",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x4dd97080adf36103bd3db822f9d3c0e44890fd69",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0xe309d011cc6f189a3e8dcba85922715a019fed38",
        "payTakerTransformer": "0x5ba7b9be86cda01cfbf56e0fb97184783be9dda1",
        "affiliateFeeTransformer": "0xbed27284b42e5684e987169cf1da09c5d6c49fa8",
        "fillQuoteTransformer": "0x01c082e47c8dc6dedd01e3fcb07bfd3eb72e044d",
        "positiveSlippageFeeTransformer": "0x4cd8f1c0df4d40fcc1e073845d5f6f4ed5cc8dab"
    },
    "43114": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xca7bab1b2d1ec7d81710b7f9e2ab4e6788930588",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0xa60b57833dce6260f4f2411c811755dd980bc0a7",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x8953c63d0858d286cc407cd6f8e26b9cbd02a511",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b8b52391071d71cd4ad1e61d7f273268fa34c6c",
        "payTakerTransformer": "0x898c6fde239d646c73f0a57e3570b6f86a3d62a3",
        "affiliateFeeTransformer": "0x34617b855411e52fbc05899435f44cbd0503022c",
        "fillQuoteTransformer": "0xcee9118bc14e1fe740c54c754b901629b322ee4f",
        "positiveSlippageFeeTransformer": "0x470ba89da18a6db6e8a0567b3c9214b960861857"
    },
    "250": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0xf760c5b88d970d6f97e64e264dac5a3767dafd74",
        "exchangeProxy": "0xdef189deaef76e379df891899eb5a00a94cbc250",
        "exchangeProxyTransformerDeployer": "0x47f01db18a38261e4cb153bae6db7d3743acb33c",
        "exchangeProxyFlashWallet": "0xb4d961671cadfed687e040b076eee29840c142e5",
        "exchangeProxyLiquidityProviderSandbox": "0xca64d4225804f2ae069760cb5ff2f1d8bac1c2f9",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x9b6aa8f26a92108e7d1f66373d757bb955112703",
        "payTakerTransformer": "0x32df54951d33d7460e15fa59b1fcc262183ce4c2",
        "affiliateFeeTransformer": "0x67efa679a4b56c38713d478e649c88247f4f8e88",
        "fillQuoteTransformer": "0xe40f81ef6e9c95ba04c659b8d032eab73152aafd",
        "positiveSlippageFeeTransformer": "0xe87d69b285005cc82b53b844322652c49ed64600"
    },
    "10": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x4200000000000000000000000000000000000006",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x6d506b2847df0c6f04d2628da1adaf4d8fb2e81b",
        "exchangeProxy": "0xdef1abe32c034e558cdd535791643c58a13acc10",
        "exchangeProxyTransformerDeployer": "0x3a539ed6bd42de8fbaf3899fb490c792e153d647",
        "exchangeProxyFlashWallet": "0xa3128d9b7cca7d5af29780a56abeec12b05a6740",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x02ce7af6520e2862f961f5d7eda746642865179c",
        "payTakerTransformer": "0x085d10a34f14f6a631ea8ff7d016782ee3ffaa11",
        "affiliateFeeTransformer": "0x55cf1d7535250db75bf0190493f55781ee583553",
        "fillQuoteTransformer": "0x845c75a791cceb1a451f4ca5778c011226dda95c",
        "positiveSlippageFeeTransformer": "0xb11e14565dfbeb702dea9bc0cb47f1a8b32f4783"
    },
    "42161": {
        "zrxToken": "0x0000000000000000000000000000000000000000",
        "etherToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        "zeroExGovernor": "0x0000000000000000000000000000000000000000",
        "zrxVault": "0x0000000000000000000000000000000000000000",
        "staking": "0x0000000000000000000000000000000000000000",
        "stakingProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeProxy": "0x0000000000000000000000000000000000000000",
        "erc20BridgeSampler": "0x0000000000000000000000000000000000000000",
        "exchangeProxyGovernor": "0x1fe80d5ad9464dba2d60b88e449305f184823f8a",
        "exchangeProxy": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "exchangeProxyTransformerDeployer": "0x29f80c1f685e19ae1807063eda432f431ac623d0",
        "exchangeProxyFlashWallet": "0xdb6f1920a889355780af7570773609bd8cb1f498",
        "exchangeProxyLiquidityProviderSandbox": "0x0000000000000000000000000000000000000000",
        "zrxTreasury": "0x0000000000000000000000000000000000000000",
        "wethTransformer": "0x10e968968f49dd66a5efeebbb2edcb9c49c4fc49",
        "payTakerTransformer": "0xae3e8cf7bf340d7084f312dfae2aa8b01c885b02",
        "affiliateFeeTransformer": "0x05a24978471869327904ea13da3c4322128e2aaa",
        "fillQuoteTransformer": "0x466b00a77662245c2cc7b093a7102a687afc16f3",
        "positiveSlippageFeeTransformer": "0xd56b9c014b45ed95e2a048a0c28121db30265f13"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000da6d9fc5998f550a094585cf9171f0e8ee3ac59f0000000000000000000000008ed95d1746bf1e4dab58d8ed4724f1ef95b20db0000000000000000000000000d8c38704c9937ea3312de29f824b4ad3450a5e61000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff00000000000000000000000022f9dcf4647084d6c31b2765f6910cd85c178c18000000000000000000000000618f9c67ce7bf1a50afa1e7e0238422601b0ff6e000000000000000000000000407b4128e9ecad8769b2332312a9f655cb9f5f3a00000000000000000000000039dce47a67ad34344eab877eae3ef1fa2a1d50bb000000000000000000000000d75a9019a2a1782ea670e4f4a55f04b43514ed530000000000000000000000004638a7ebe75b911b995d0ec73a81e4f85f41f24e000000000000000000000000a9416ce1dbde8d331210c07b5c253d94ee4cc3fd0000000000000000000000002a17c35ff147b32f13f19f2e311446eeb02503f3000000000000000000000000a26e80e7dea86279c6d778d702cc413e6cffa777000000000000000000000000b2bc06a4efb20fc6553a69dbfa49b7be938034a70000000000000000000000007d3455421bbc5ed534a83c88fd80387dc8271392000000000000000000000000e41d2489571d322189246dafa5ebde1f4699f4980000000000000000000000000bb1810061c2f5b2088054ee184e6c79e1591101000000000000000000000000ba7f8b5fb1b19c1211c5d49550fcd149177a5eaf
    ├─ [0] [34mVM[0m::[34mprojectRoot[0m() [33m[0m
    │   └─ [34m← [0m/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex
    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mreadFile[0m(/Users/0xnoah/Documents/protocolTest/protocol/contracts/zero-ex/contracts/test/foundry/addresses/sourceAddresses.json) [33m[0m
    │   └─ [34m← [0m{
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}

    ├─ [0] [34mVM[0m::[34mparseJson[0m({
    "1": {
        "UniswapV2Router": "0xf164fc0ec4e93095b804a4795bbe1e041497b92a"
    },
    "56": {
        "UniswapV2Router": "0x10ed43c718714eb63d5aa57b78b54704e256024e"
    },
    "137": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "43114": {
        "UniswapV2Router": "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10"
    },
    "250": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    },
    "10": {
        "UniswapV2Router": "0x0000000000000000000000000000000000000000"
    },
    "42161": {
        "UniswapV2Router": "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"
    }
}
, .1) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000f164fc0ec4e93095b804a4795bbe1e041497b92a
    ├─ emit [36mlog_named_uint[0m(key:            WethTransformer nonce, val: 6)
    ├─ [0] [34mVM[0m::[34mstartPrank[0m(zeroEx/exchangeProxyTransformerDeployer: [0x39dCe47a67aD34344EAB877eaE3Ef1FA2a1d50Bb]) [33m[0m
    │   └─ [34m← [0m()
    ├─ [4882116] [33m→ [0m[33mnew[0m zeroEx/fillQuoteTransformer@0xd75A9019a2A1782Ea670e4F4a55f04B43514ed53
    │   └─ [32m← [0m24378 bytes of code
    ├─ [2232965] [33m→ [0m[33mnew[0m zeroEx/FillQuoteTransformer@0xd8E10b0689d0B2f28136777635caA4AbD2bB9F04
    │   └─ [32m← [0m11150 bytes of code
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/FillQuoteTransformer: [0xd8E10b0689d0B2f28136777635caA4AbD2bB9F04], zeroEx/FillQuoteTransformer) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mstopPrank[0m() [33m[0m
    │   └─ [34m← [0m()
    ├─ emit [36mlog_named_uint[0m(key:            FillQuoteTransformer nonce, val: 26)
    ├─ [0] [34mVM[0m::[34mderiveKey[0m(<pk>) [33m[0m
    │   └─ [34m← [0m<pk>
    ├─ [0] [34mVM[0m::[34maddr[0m(<pk>) [33m[0m
    │   └─ [34m← [0mzeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]
    ├─ [0] [34mVM[0m::[34mlabel[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], zeroEx/MarketMaker) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34maddr[0m(<pk>) [33m[0m
    │   └─ [34m← [0mzeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]
    ├─ emit [36mlog_named_string[0m(key: WARNING, val: Test tip(address,address,uint256): The `tip` stdcheat has been deprecated. Use `deal` instead.)
    ├─ [0] [34mVM[0m::[34mrecord[0m() [33m[0m
    │   └─ [34m← [0m()
    ├─ [9815] [32mUSDC[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[staticcall][0m
    │   ├─ [2529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34maccesses[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48]) [33m[0m
    │   └─ [34m← [0m[0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b, 0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3, 0xcb8911fb82c2d10f6cf1d31d1e521ad3f4e3f42615f6ba67c454a9a2fdb9b6a7], []
    ├─ [0] [34mVM[0m::[34mload[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000807a96288a1a408dbc13de2b1d087d10356395d2
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b, 0x1337000000000000000000000000000000000000000000000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [1315] [32mUSDC[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[staticcall][0m
    │   ├─ [529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b, 0x000000000000000000000000807a96288a1a408dbc13de2b1d087d10356395d2) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mload[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3) [33m[0m
    │   └─ [34m← [0m0x000000000000000000000000a2327a938febf5fec13bacfb16ae10ecbc4cbdcf
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3, 0x1337000000000000000000000000000000000000000000000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [3283] [32mUSDC[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[staticcall][0m
    │   ├─ [0] [32m0x0000000000000000000000000000000000000000[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m()
    │   └─ [32m← [0m()
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3, 0x000000000000000000000000a2327a938febf5fec13bacfb16ae10ecbc4cbdcf) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mload[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0xcb8911fb82c2d10f6cf1d31d1e521ad3f4e3f42615f6ba67c454a9a2fdb9b6a7) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ emit [36mWARNING_UninitedSlot[0m(who: USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], slot: 92061690420682965222154294547751512818492351710878667848452063211835425928871)
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0xcb8911fb82c2d10f6cf1d31d1e521ad3f4e3f42615f6ba67c454a9a2fdb9b6a7, 0x1337000000000000000000000000000000000000000000000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [1315] [32mUSDC[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[staticcall][0m
    │   ├─ [529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x1337000000000000000000000000000000000000000000000000000000000000
    │   └─ [32m← [0m0x1337000000000000000000000000000000000000000000000000000000000000
    ├─ emit [36mSlotFound[0m(who: USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], fsig: 0x70a08231, keysHash: 0x723077b8a1b173adc35e5f0e7e3662fd1208212cb629f9c128551ea7168da722, slot: 92061690420682965222154294547751512818492351710878667848452063211835425928871)
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0xcb8911fb82c2d10f6cf1d31d1e521ad3f4e3f42615f6ba67c454a9a2fdb9b6a7, 0x0000000000000000000000000000000000000000000000000000000000000000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [1315] [32mUSDC[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[staticcall][0m
    │   ├─ [529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mload[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0xcb8911fb82c2d10f6cf1d31d1e521ad3f4e3f42615f6ba67c454a9a2fdb9b6a7) [33m[0m
    │   └─ [34m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    ├─ [0] [34mVM[0m::[34mstore[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0xcb8911fb82c2d10f6cf1d31d1e521ad3f4e3f42615f6ba67c454a9a2fdb9b6a7, 0x0000000000000000000000000000000000000000000000056bc75e2d63100000) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mprank[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[0m
    │   └─ [34m← [0m()
    ├─ [31867] [32mUSDC[0m::[32mapprove[0m(zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF], 100000000000000000000) [33m[0m
    │   ├─ [31078] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mapprove[0m(zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF], 100000000000000000000) [33m[delegatecall][0m
    │   │   ├─ emit [36mApproval[0m(_owner: zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], _spender: zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF], _value: 100000000000000000000)
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    ├─ [0] [34mVM[0m::[34mprank[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[0m
    │   └─ [34m← [0m()
    ├─ [0] [34mVM[0m::[34mgetNonce[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]) [33m[0m
    │   └─ [34m← [0m0x00000000000000000000000000000000000000000000000000000000000000da
    ├─ [7699] [32mzeroEx/exchangeProxy[0m::[32mgetOtcOrderHash[0m((0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 1000000000000000000, 1000000000000000000, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 0x0000000000000000000000000000000000000000, 0x00a329c0648769A73afAc7F9381E08FB43dBEA72, 10393490849018163441524569317769385871874303876584145705395311083738)) [33m[staticcall][0m
    │   ├─ [1957] [32m0x5Ebac8dbfbBA22168471b0f914131d1976536A25[0m::[32mgetOtcOrderHash[0m((0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 1000000000000000000, 1000000000000000000, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 0x0000000000000000000000000000000000000000, 0x00a329c0648769A73afAc7F9381E08FB43dBEA72, 10393490849018163441524569317769385871874303876584145705395311083738)) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x7a3855e6d3f929ec08fbd4c27f8f5e3cdd05ad2748e49f754f666d2cfdc86eb9
    │   └─ [32m← [0m0x7a3855e6d3f929ec08fbd4c27f8f5e3cdd05ad2748e49f754f666d2cfdc86eb9
    ├─ [0] [34mVM[0m::[34msign[0m(<pk>, 0x7a3855e6d3f929ec08fbd4c27f8f5e3cdd05ad2748e49f754f666d2cfdc86eb9) [33m[0m
    │   └─ [34m← [0m28, 0x985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de, 0x785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a
    ├─ emit [36mlog_string[0m(:         Successful fill, makerTokens bought)
    ├─ [182337] [32mzeroEx/exchangeProxy[0m::[32mtransformERC20[0m{value: 1000000000000000000}(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 1000000000000000000, 1000000000000000000, [(6, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000), (26, 0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000003600000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a329c0648769a73afac7f9381e08fb43dbea720000000062b12d3c0000000000000000000000000000000000000000000000da0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001c985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003)]) [33m[0m
    │   ├─ [176121] [32m0x44A6999Ec971cfCA458AFf25A808F272f6d492A2[0m::[32mtransformERC20[0m(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 1000000000000000000, 1000000000000000000, [(6, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000), (26, 0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000003600000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a329c0648769a73afac7f9381e08fb43dbea720000000062b12d3c0000000000000000000000000000000000000000000000da0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001c985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003)]) [33m[delegatecall][0m
    │   │   ├─ [3315] [32mUSDC[0m::[32mbalanceOf[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   ├─ [2529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000000
    │   │   ├─ [55] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mfallback[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   └─ [32m← [0m()
    │   │   ├─ [38458] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteDelegateCall[0m(zeroEx/wethTransformer: [0xb2bc06a4EfB20FC6553a69Dbfa49B7bE938034A7], 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e8400000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000) [33m[0m
    │   │   │   ├─ [34691] [32mzeroEx/wethTransformer[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000de0b6b3a7640000)) [33m[delegatecall][0m
    │   │   │   │   ├─ [23974] [32mWrappedNativeToken[0m::[32mdeposit[0m{value: 1000000000000000000}() [33m[0m
    │   │   │   │   │   ├─ emit [36mDeposit[0m(_owner: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m()
    │   │   │   │   └─ [32m← [0m0x13c9929e00000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [88222] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteDelegateCall[0m(zeroEx/FillQuoteTransformer: [0xd8E10b0689d0B2f28136777635caA4AbD2bB9F04], 0x832b24bb0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e84000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000003c000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000003600000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a329c0648769a73afac7f9381e08fb43dbea720000000062b12d3c0000000000000000000000000000000000000000000000da0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001c985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003) [33m[0m
    │   │   │   ├─ [86784] [32mzeroEx/FillQuoteTransformer[0m::[32mtransform[0m((0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84, 0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000003600000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a329c0648769a73afac7f9381e08fb43dbea720000000062b12d3c0000000000000000000000000000000000000000000000da0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001c985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003)) [33m[delegatecall][0m
    │   │   │   │   ├─ [534] [32mWrappedNativeToken[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18]) [33m[staticcall][0m
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   │   ├─ [2717] [32mWrappedNativeToken[0m::[32mallowance[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], zeroEx/exchangeProxy: [0xDef1C0ded9bec7F1a1670819833240f027b25EfF]) [33m[staticcall][0m
    │   │   │   │   │   └─ [32m← [0m0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
    │   │   │   │   ├─ [73688] [32mzeroEx/exchangeProxy[0m::[32mfillOtcOrder[0m((0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 1000000000000000000, 1000000000000000000, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 0x0000000000000000000000000000000000000000, 0x00a329c0648769A73afAc7F9381E08FB43dBEA72, 10393490849018163441524569317769385871874303876584145705395311083738), (2, 28, 0x985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de, 0x785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a), 1000000000000000000) [33m[0m
    │   │   │   │   │   ├─ [71044] [32m0x5Ebac8dbfbBA22168471b0f914131d1976536A25[0m::[32mfillOtcOrder[0m((0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, 1000000000000000000, 1000000000000000000, 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 0x0000000000000000000000000000000000000000, 0x00a329c0648769A73afAc7F9381E08FB43dBEA72, 10393490849018163441524569317769385871874303876584145705395311083738), (2, 28, 0x985cf681eba9910d846dca54f13a72266054978c1afb7c774cb1629a5ce3e7de, 0x785a4a35fa68237d15b61340f2c51aa8e01e97af3c04fa46b101c08f66eac07a), 1000000000000000000) [33m[delegatecall][0m
    │   │   │   │   │   │   ├─ [3000] [32mPRECOMPILE[0m::[32mecrecover[0m(0x7a3855e6d3f929ec08fbd4c27f8f5e3cdd05ad2748e49f754f666d2cfdc86eb9, 28, 68915804246868677132714824533369331124120471227733621717400712857659560421342, 54437070250299770118796847148919531396969764170984633592968507377364226457722) [33m[staticcall][0m
    │   │   │   │   │   │   │   └─ [32m← [0mzeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266]
    │   │   │   │   │   │   ├─ [20260] [32mWrappedNativeToken[0m::[32mtransferFrom[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], 1000000000000000000) [33m[0m
    │   │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], _to: zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], _value: 1000000000000000000)
    │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   ├─ [29892] [32mUSDC[0m::[32mtransferFrom[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], 1000000000000000000) [33m[0m
    │   │   │   │   │   │   │   ├─ [29097] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mtransferFrom[0m(zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], 1000000000000000000) [33m[delegatecall][0m
    │   │   │   │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], _to: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], _value: 1000000000000000000)
    │   │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   │   │   ├─ emit [36mOtcOrderFilled[0m(orderHash: 0x7a3855e6d3f929ec08fbd4c27f8f5e3cdd05ad2748e49f754f666d2cfdc86eb9, maker: zeroEx/MarketMaker: [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266], taker: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], makerToken: USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], takerToken: WrappedNativeToken: [0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2], makerTokenFilledAmount: 1000000000000000000, takerTokenFilledAmount: 1000000000000000000)
    │   │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   │   └─ [32m← [0m0x13c9929e00000000000000000000000000000000000000000000000000000000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002013c9929e00000000000000000000000000000000000000000000000000000000
    │   │   ├─ [1315] [32mUSDC[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18]) [33m[staticcall][0m
    │   │   │   ├─ [529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ [22407] [32mzeroEx/exchangeProxyFlashWallet[0m::[32mexecuteCall[0m(USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], 0xa9059cbb000000000000000000000000b4c79dab8f259c7aee6e5b2aa729821864227e840000000000000000000000000000000000000000000000000de0b6b3a7640000, 0) [33m[0m
    │   │   │   ├─ [21374] [32mUSDC[0m::[32mtransfer[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[0m
    │   │   │   │   ├─ [20743] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mtransfer[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], 1000000000000000000) [33m[delegatecall][0m
    │   │   │   │   │   ├─ emit [36mTransfer[0m(_from: zeroEx/exchangeProxyFlashWallet: [0x22F9dCF4647084d6C31b2765F6910cd85C178C18], _to: NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], _value: 1000000000000000000)
    │   │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000000000000000001
    │   │   │   └─ [32m← [0m0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001
    │   │   ├─ [1315] [32mUSDC[0m::[32mbalanceOf[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   │   │   ├─ [529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   │   ├─ emit [36mTransformedERC20[0m(taker: NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84], inputToken: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE, outputToken: USDC: [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48], inputTokenAmount: 1000000000000000000, outputTokenAmount: 1000000000000000000)
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    ├─ [1315] [32mUSDC[0m::[32mbalanceOf[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[staticcall][0m
    │   ├─ [529] [32m0xa2327a938Febf5FEC13baCFb16Ae10EcBc4cbDCF[0m::[32mbalanceOf[0m(NativeTokenToERC20WithOtcTest: [0xb4c79daB8f259C7Aee6E5b2Aa729821864227e84]) [33m[delegatecall][0m
    │   │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    │   └─ [32m← [0m0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
    └─ [32m← [0m()

Test result: [32mok[0m. 1 passed; 0 failed; finished in 5.95s
