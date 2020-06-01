# [1.6.0](https://github.com/0xProject/0x-api/compare/v1.5.0...v1.6.0) (2020-06-01)


### Bug Fixes

* Re-pin asset-swapper to latest monorepo commit ([#240](https://github.com/0xProject/0x-api/issues/240)) ([dfbf0e7](https://github.com/0xProject/0x-api/commit/dfbf0e719fe1a2371e0a2e5dcc9a2824f9de4529))


### Features

* add estimatedGas, estimatedGasTokenRefund and minimumProtocolFee to /quote and /price  response ([#237](https://github.com/0xProject/0x-api/issues/237)) ([f7f3277](https://github.com/0xProject/0x-api/commit/f7f3277510fcc05f03f0a187e64364e02305e3ee))

# [1.5.0](https://github.com/0xProject/0x-api/compare/v1.4.0...v1.5.0) (2020-05-25)


### Bug Fixes

* unify the response data from /swap/v0/price and /meta_transaction/v0/price ([#228](https://github.com/0xProject/0x-api/issues/228)) ([62f3fae](https://github.com/0xProject/0x-api/commit/62f3fae42a8ab7e73b644f0e8c523d655e6319e8))


### Features

* Add Prometheus Monitoring ([#222](https://github.com/0xProject/0x-api/issues/222)) ([5a51add](https://github.com/0xProject/0x-api/commit/5a51add4f0351d1e8567817411cdd24a984c2c28))
* added an epochs/n endpoint to get info on an arbitrary epoch ([#230](https://github.com/0xProject/0x-api/issues/230)) ([68ec159](https://github.com/0xProject/0x-api/commit/68ec1595b99c15e50c5cfeae682cf16b68d83be1))
* lower default slippage percentage to 1% ([#238](https://github.com/0xProject/0x-api/issues/238)) ([c7ec0ff](https://github.com/0xProject/0x-api/commit/c7ec0ff80d13d141dbc062b88ef5a97fd5b387a3))
* MetaTxn add signer heartbeat and status ([#236](https://github.com/0xProject/0x-api/issues/236)) ([3a11867](https://github.com/0xProject/0x-api/commit/3a118670ec6376203400650f39b93e06fc1c76af))
* set default skip RFQt buy requests to false ([#232](https://github.com/0xProject/0x-api/issues/232)) ([a5d7a1c](https://github.com/0xProject/0x-api/commit/a5d7a1ce8d539382fada237f77fbcb637aaf3791))

# [1.4.0](https://github.com/0xProject/0x-api/compare/v1.3.0...v1.4.0) (2020-05-18)

### Bug Fixes

-   re-allow unknown tokens to be queried in the swap/quote endpoint ([#226](https://github.com/0xProject/0x-api/issues/226)) ([1379e63](https://github.com/0xProject/0x-api/commit/1379e638693e030ab343adfa9893a6f42081ea01))

### Features

-   add transaction watcher service ([#215](https://github.com/0xProject/0x-api/issues/215)) ([7bbb9c6](https://github.com/0xProject/0x-api/commit/7bbb9c6f0992ae2a9a9ae9f2fe6d59f99a8e121a))
-   Improve RFQ-T logging ([#219](https://github.com/0xProject/0x-api/issues/219)) ([22b6b0c](https://github.com/0xProject/0x-api/commit/22b6b0c1fb15513bc1225ca5f3a8918639fe8f32))

# [1.3.0](https://github.com/0xProject/0x-api/compare/v1.2.0...v1.3.0) (2020-05-11)

### Features

-   Remove Kyber exclusion ([#211](https://github.com/0xProject/0x-api/issues/211)) ([aa600ab](https://github.com/0xProject/0x-api/commit/aa600abd74bb963303720d8a3cdf3b5f5044ae4f))
-   RFQ-T follow-ups ([#201](https://github.com/0xProject/0x-api/issues/201)) ([a55f22e](https://github.com/0xProject/0x-api/commit/a55f22ee866f0ce8a8e5164829bc511838019a47)), closes [/github.com/0xProject/0x-api/pull/201#discussion_r417775612](https://github.com//github.com/0xProject/0x-api/pull/201/issues/discussion_r417775612)

# [1.2.0](https://github.com/0xProject/0x-api/compare/v1.1.0...v1.2.0) (2020-05-04)

### Bug Fixes

-   specify an image name for the Docker push, fix typos ([512deab](https://github.com/0xProject/0x-api/commit/512deab78da744e86ca7e2f58d2c6e09e4f78c05))

### Features

-   Added pool breakdown of operator vs member stake, added option to add… ([#202](https://github.com/0xProject/0x-api/issues/202)) ([e20daa5](https://github.com/0xProject/0x-api/commit/e20daa5bb1cf6271b83d977459227fd80d1794cd))

# [1.1.0](https://github.com/0xProject/0x-api/compare/v1.0.0...v1.1.0) (2020-05-01)

### Bug Fixes

-   sixtySecondsFromNow timestamp ([#208](https://github.com/0xProject/0x-api/issues/208)) ([f82785d](https://github.com/0xProject/0x-api/commit/f82785ddd9ee465ae70907d443e79df3369e093c))
-   Typo in semantic release configuration ([d4030a0](https://github.com/0xProject/0x-api/commit/d4030a085d7f6847504087e97608c93c7031b57e))

### Features

-   Support RFQT via Meta-txn Endpoints ([#203](https://github.com/0xProject/0x-api/issues/203)) ([ea9a7e0](https://github.com/0xProject/0x-api/commit/ea9a7e0ad32855796c4cf9ef125b075f5761e71d))
