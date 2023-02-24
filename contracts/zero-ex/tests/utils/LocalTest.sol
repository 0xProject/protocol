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

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import {Test} from "forge-std/Test.sol";
import {IERC20Token} from "@0x/contracts-erc20/src/IERC20Token.sol";
import {IEtherToken} from "@0x/contracts-erc20/src/IEtherToken.sol";
import {WETH9V06} from "@0x/contracts-erc20/src/v06/WETH9V06.sol";
import {IFlashWallet} from "src/external/IFlashWallet.sol";
import {LibERC20Transformer} from "src/transformers/LibERC20Transformer.sol";
import {LibNativeOrder} from "src/features/libs/LibNativeOrder.sol";
import {LibSignature} from "src/features/libs/LibSignature.sol";
import {IMultiplexFeature} from "src/features/interfaces/IMultiplexFeature.sol";
import {ITransformERC20Feature} from "src/features/interfaces/ITransformERC20Feature.sol";
import {TestUtils} from "utils/TestUtils.sol";
import {DeployZeroEx} from "utils/DeployZeroEx.sol";
import {TestMintTokenERC20Transformer} from "../../contracts/test/TestMintTokenERC20Transformer.sol";
import {TestMintableERC20Token} from "../../contracts/test/tokens/TestMintableERC20Token.sol";
import {TestUniswapV2Factory} from "../../contracts/test/integration/TestUniswapV2Factory.sol";
import {TestUniswapV2Pool} from "../../contracts/test/integration/TestUniswapV2Pool.sol";
import {TestUniswapV3Factory} from "../../contracts/test/integration/TestUniswapV3Factory.sol";
import {TestUniswapV3Pool} from "../../contracts/test/integration/TestUniswapV3Pool.sol";
import {TestLiquidityProvider} from "../../contracts/test/integration/TestLiquidityProvider.sol";

contract LocalTest is Test, TestUtils {
    uint24 internal constant UNIV3_POOL_FEE = 1234;

    DeployZeroEx.ZeroExDeployed internal zeroExDeployed;
    IFlashWallet internal flashWallet;
    IERC20Token internal shib;
    IERC20Token internal dai;
    IERC20Token internal zrx;
    IEtherToken internal weth;

    TestUniswapV2Factory internal sushiFactory;
    TestUniswapV2Factory internal uniV2Factory;
    TestUniswapV3Factory internal uniV3Factory;
    TestLiquidityProvider internal liquidityProvider;
    uint256 internal transformerNonce;

    address internal signerAddress;
    uint256 internal signerKey;

    address internal otherSignerAddress;
    uint256 internal otherSignerKey;

    function _infiniteApprovals() private {
        shib.approve(address(zeroExDeployed.zeroEx), type(uint256).max);
        dai.approve(address(zeroExDeployed.zeroEx), type(uint256).max);
        zrx.approve(address(zeroExDeployed.zeroEx), type(uint256).max);
        weth.approve(address(zeroExDeployed.zeroEx), type(uint256).max);
    }

    function setUp() public {
        (signerAddress, signerKey) = _getSigner();

        sushiFactory = new TestUniswapV2Factory();
        uniV2Factory = new TestUniswapV2Factory();
        uniV3Factory = new TestUniswapV3Factory();
        liquidityProvider = new TestLiquidityProvider();

        zeroExDeployed = new DeployZeroEx(
            DeployZeroEx.ZeroExDeployConfiguration({
                uniswapFactory: address(uniV2Factory),
                sushiswapFactory: address(sushiFactory),
                uniswapV3Factory: address(uniV3Factory),
                uniswapPairInitCodeHash: uniV2Factory.POOL_INIT_CODE_HASH(),
                sushiswapPairInitCodeHash: sushiFactory.POOL_INIT_CODE_HASH(),
                uniswapV3PoolInitCodeHash: uniV3Factory.POOL_INIT_CODE_HASH(),
                logDeployed: false
            })
        ).deployZeroEx();

        transformerNonce = zeroExDeployed.transformerDeployer.nonce();
        vm.prank(zeroExDeployed.transformerDeployer.authorities(0));
        zeroExDeployed.transformerDeployer.deploy(type(TestMintTokenERC20Transformer).creationCode);

        flashWallet = zeroExDeployed.zeroEx.getTransformWallet();

        shib = IERC20Token(address(new TestMintableERC20Token()));
        dai = IERC20Token(address(new TestMintableERC20Token()));
        zrx = IERC20Token(address(new TestMintableERC20Token()));
        weth = zeroExDeployed.weth;

        // TODO this should be somewhere else
        string memory mnemonic = "conduct into noodle wreck before satisfy alarm vendor dose lunch vapor party";
        otherSignerKey = vm.deriveKey(mnemonic, 0);
        otherSignerAddress = vm.addr(otherSignerKey);
        vm.label(otherSignerAddress, "zeroEx/OtherGuy");

        _infiniteApprovals();

        vm.startPrank(signerAddress);
        _infiniteApprovals();
        vm.stopPrank();

        vm.startPrank(otherSignerAddress);
        _infiniteApprovals();
        vm.stopPrank();

        vm.deal(address(this), 20e18);
    }

    function _mintTo(address token, address recipient, uint256 amount) internal {
        if (token == address(weth)) {
            IEtherToken(token).deposit{value: amount}();
            WETH9V06(payable(token)).transfer(recipient, amount);
        } else {
            TestMintableERC20Token(token).mint(recipient, amount);
        }
    }

    function _createUniswapV2Pool(
        TestUniswapV2Factory factory,
        IERC20Token tokenA,
        IERC20Token tokenB,
        uint112 balanceA,
        uint112 balanceB
    ) internal returns (address poolAddress) {
        TestUniswapV2Pool pool = factory.createPool(tokenA, tokenB);
        _mintTo(address(tokenA), address(pool), balanceA);
        _mintTo(address(tokenB), address(pool), balanceB);

        (uint112 balance0, uint112 balance1) = tokenA < tokenB ? (balanceA, balanceB) : (balanceB, balanceA);
        pool.setReserves(balance0, balance1, 0);

        return address(pool);
    }

    function _createUniswapV3Pool(
        TestUniswapV3Factory factory,
        IERC20Token tokenA,
        IERC20Token tokenB,
        uint112 balanceA,
        uint112 balanceB
    ) internal returns (address poolAddress) {
        poolAddress = address(factory.createPool(tokenA, tokenB, UNIV3_POOL_FEE));
        _mintTo(address(tokenA), poolAddress, balanceA);
        _mintTo(address(tokenB), poolAddress, balanceB);
    }
}
