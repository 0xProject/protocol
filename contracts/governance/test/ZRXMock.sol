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

pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "@openzeppelin/token/ERC20/ERC20.sol";

// TODO remove this contract and work with an instance of ZRX compiled with 0.4
// when the following is resolved https://linear.app/0xproject/issue/PRO-44/zrx-artifact-is-incompatible-with-foundry
contract ZRXMock is ERC20 {
    constructor() ERC20("0x Protocol Token", "ZRX") {
        _mint(msg.sender, 10 ** 27);
    }
}
