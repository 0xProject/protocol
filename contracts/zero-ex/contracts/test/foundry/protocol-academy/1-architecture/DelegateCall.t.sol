
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

import "forge-std/Test.sol";

interface LanguageContract {
    function hello()
        external
        returns (address, string memory);
}

contract ContractA is LanguageContract {
    function hello()
        public
        override
        returns (address, string memory)
    {
        return (address(this), "Why hello there!");
    }
}

contract ContractB is LanguageContract {
    function hello()
        public
        override
        returns (address, string memory)
    {
        return (address(this), "Protocol Academy was here");
    }
}

contract DelegateCaller {
    function delegateCall(address impl)
        public
        returns (address addr, string memory str)
    {
        (bool success, bytes memory resultData) = impl.delegatecall(abi.encodePacked(LanguageContract.hello.selector));
        (addr, str) = abi.decode(resultData, (address, string));
    }
}

contract DelegateCall is Test {
    LanguageContract A;
    LanguageContract B;
    DelegateCaller caller;

    function setUp()
      public
    {
        A = new ContractA();
        B = new ContractB();
        caller = new DelegateCaller();
    }


    function testDelegateCall()
        public
        returns (uint256 val)
    {
        // ← DelegateCaller: [0xefc56627233b02ea95bae7e19f648d7dcd5bb132], "Why hello there!"
        caller.delegateCall(address(A));

        // ← DelegateCaller: [0xefc56627233b02ea95bae7e19f648d7dcd5bb132], "Protocol Academy was here"
        caller.delegateCall(address(B));

        // Note how in the above results the context is always the DelegateCaller context
        // with address 0xefc56627233b02ea95bae7e19f648d7dcd5bb132

        // ← ContractA: [0xce71065d4017f316ec606fe4422e11eb2c47c246], "Why hello there!"
        A.hello();

        // ← ContractB: [0x185a4dc360ce69bdccee33b3784b0282f7961aea], "Protocol Academy was here"
        B.hello();

        // Note how in the above results the context is each individual contract
    }
}
