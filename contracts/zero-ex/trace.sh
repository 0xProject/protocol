No files changed, compilation skipped

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

Test result: [32mok[0m. 1 passed; 0 failed; finished in 3.69s

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

Test result: [32mok[0m. 1 passed; 0 failed; finished in 3.69s
