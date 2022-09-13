// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2022 ZeroEx Intl.

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


import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "src/features/OtcOrdersFeature.sol";
import "src/features/interfaces/IOtcOrdersFeature.sol";
import "src/features/libs/LibNativeOrder.sol";
import "src/features/libs/LibSignature.sol";
import "../utils/DeployZeroEx.sol";
import "../utils/MintableERC20.sol";


contract OtcOrdersFeatureTest is DeployZeroEx {

    uint256 MAX_INT = uint256(-1);
    address payable internal NULL_ADDRESS = address(0);
    uint256 internal makerPk = 0xdeadbeef;
    uint256 internal maker2Pk = 0xd00d00;
    uint256 internal takerPk = 0xc0ffee;
    uint256 internal workerPk = 0xb10b;
    address payable internal maker = payable(vm.addr(makerPk));
    address payable internal maker2 = payable(vm.addr(maker2Pk));
    address payable internal taker = payable(vm.addr(takerPk));
    address payable internal worker = payable(vm.addr(workerPk));
    MintableERC20 internal token1;
    MintableERC20 internal token2;
    
    function getOrderAndSignature(
      address maker,
      address makerToken,
      uint128 makerAmount,
      address taker,
      address takerToken,
      uint128 takerAmount
    ) 
      internal 
      returns (
        LibNativeOrder.OtcOrder memory order,
        LibSignature.Signature memory signature
      )
    {
        uint256 expiry = (block.timestamp + 120) << 192;
        uint256 bucket = 1 << 128;
        uint256 nonce = 0;
        uint256 expiryAndNonce = expiry | bucket | nonce;

        LibNativeOrder.OtcOrder memory order = LibNativeOrder.OtcOrder({
          maker: maker,
          makerToken: IERC20TokenV06(makerToken),
          makerAmount: makerAmount,
          taker: taker,
          takerToken: IERC20TokenV06(takerToken),
          takerAmount: takerAmount,
          txOrigin: worker,
          expiryAndNonce: expiryAndNonce
        });

        // sign
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(takerPk, IZERO_EX.getOtcOrderHash(order));
        LibSignature.Signature memory signature = LibSignature.Signature({
          signatureType: LibSignature.SignatureType.EIP712,
          v: v,
          r: r,
          s: s
        });

        return (order, signature);

    }

    function setUp() public {
        deployZeroExAtRandomAddress();
        // WETH wrapping and unwrapping is not going to work at this address
        IEtherTokenV06 WETH = IEtherTokenV06(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
        OtcOrdersFeature otcOrdersFeature = new OtcOrdersFeature(address(ZERO_EX), WETH);
        IZERO_EX.migrate(address(otcOrdersFeature), abi.encodePacked(otcOrdersFeature.migrate.selector), address(this));

        // Deploy some tokens
        token1 = new MintableERC20();
        token2 = new MintableERC20();

        // Mint 
        token1.mint(maker, 1000);
        token2.mint(maker, 1000);

        token1.mint(taker, 1000);
        token2.mint(taker, 1000);

        // Set Approvals
        vm.startPrank(maker);
        token1.approve(address(ZERO_EX), MAX_INT);
        token2.approve(address(ZERO_EX), MAX_INT);
        vm.stopPrank();

        vm.startPrank(taker);
        token1.approve(address(ZERO_EX), MAX_INT);
        token2.approve(address(ZERO_EX), MAX_INT);
        vm.stopPrank();
    }

    function testMeAsdf() external {

        console.log('maker', maker);
        console.log('taker', taker);

        // The Taker is the maker for this order
        (
          LibNativeOrder.OtcOrder memory takerOrder,
          LibSignature.Signature memory takerSignature
        ) = getOrderAndSignature(
            taker,
            address(token1),
            100,
            NULL_ADDRESS,
            address(token2),
            100
          );

        (
          LibNativeOrder.OtcOrder memory makerOrder,
          LibSignature.Signature memory makerSignature
        ) = getOrderAndSignature(
            maker,
            address(token2),
            100,
            NULL_ADDRESS,
            address(token1),
            100
          );
          
        IOtcOrdersFeature.MatchingRfqLiquidity[] memory rfqLiquidity = new IOtcOrdersFeature.MatchingRfqLiquidity[](1);
        rfqLiquidity[0] = IOtcOrdersFeature.MatchingRfqLiquidity({
          makerOrder: makerOrder,
          makerSignature: makerSignature,
          settlementTakerAmount: 100,
          settlementMakerAmount: 100
        });


        IZERO_EX.matchOtcOrders(takerOrder, takerSignature, rfqLiquidity);
    }

}
