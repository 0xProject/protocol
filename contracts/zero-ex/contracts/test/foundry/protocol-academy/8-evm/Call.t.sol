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

contract Receiver {
  function receivePure() public pure {
      1 + 1;
  }

  function receiveImpure() public {
      1 + 1;
  }
}

contract Empty {

}

contract Call {
    address empty = address(new Empty());
    address receiver = address(new Receiver());

    function callUnknown() public {
      // forge debug contracts/test/foundry/protocol-academy/8-evm/Call.t.sol --sig 'callUnknown()' --tc Call

      // Why didn't this contract make a call out to 0x222... ?
      // Did solidity add a check for us?
      Receiver(0x2222222222222222222222222222222222222222).receiveImpure();
    }

    function callEmpty() public {
      // forge debug contracts/test/foundry/protocol-academy/8-evm/Call.t.sol --sig 'callEmpty()' --tc Call

      // Observe how the added Solidity checks "pass"
      // and ultimately how this results in a REVERT
      Receiver(empty).receiveImpure();
    }

    function callEmptyRaw() public {
      // forge debug contracts/test/foundry/protocol-academy/8-evm/Call.t.sol --sig 'callEmptyRaw()' --tc Call

      // Observe this low level call and how it differs from the above
      // example. Does it revert?
      empty.call(abi.encodeWithSelector(Receiver.receiveImpure.selector));
    }

    function callEmptyEOA() public {
      // forge debug contracts/test/foundry/protocol-academy/8-evm/Call.t.sol --sig 'callEmptyEOA()' --tc Call

      // Observe this low level call and how it differs from the above
      // example. Does it revert?
      address(msg.sender).call(abi.encodeWithSelector(Receiver.receiveImpure.selector));
    }

    function callReceiverImpure() public {
      // forge debug contracts/test/foundry/protocol-academy/8-evm/Call.t.sol --sig 'callReceiverImpure()' --tc Call

      // Observe how a CALL is set up and then ultimately made
      // and any checks prior to making the CALL
      Receiver(receiver).receiveImpure();
    }

    function callReceiverPure() public {
      // forge debug contracts/test/foundry/protocol-academy/8-evm/Call.t.sol --sig 'callReceiverPure()' --tc Call

      // Did you notice the different CALL type solidity chose here ?
      Receiver(receiver).receivePure();
    }

}