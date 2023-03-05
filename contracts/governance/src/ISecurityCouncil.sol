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

abstract contract ISecurityCouncil {
    address public securityCouncil;

    event SecurityCouncilAssigned(address securityCouncil);

    event SecurityCouncilEjected();

    modifier onlySecurityCouncil() {
        require(msg.sender == securityCouncil, "ZeroExProtocolGovernor: only security council allowed");
        _;
    }

    modifier securityCouncilAssigned(bytes[] memory payloads) {
        if (securityCouncil == address(0) && !_payloadIsAssignSecurityCouncil(payloads)) {
            revert("SecurityCouncil: security council not assigned and this is not an assignment call");
        }
        _;
    }

    function assignSecurityCouncil(address _securityCouncil) public virtual {
        securityCouncil = _securityCouncil;

        emit SecurityCouncilAssigned(securityCouncil);
    }

    function ejectSecurityCouncil() internal {
        securityCouncil = address(0);
        emit SecurityCouncilEjected();
    }

    function cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public virtual;

    function _payloadIsAssignSecurityCouncil(bytes[] memory payloads) private pure returns (bool) {
        require(payloads.length == 1, "SecurityCouncil: more than 1 transaction in proposal");
        bytes memory payload = payloads[0];
        // Check this is as assignSecurityCouncil(address) transaction
        // function signature for assignSecurityCouncil(address)
        // = bytes4(keccak256("assignSecurityCouncil(address)"))
        // = 0x2761c3cd
        if (bytes4(payload) == bytes4(0x2761c3cd)) return true;
        else return false;
    }
}
