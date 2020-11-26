/*

  Copyright 2020 ZeroEx Intl.

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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-utils/contracts/src/v06/AuthorizableV06.sol";


/// @dev Deployer contract for ERC20 transformers.
///      Only authorities may call `deploy()` and `kill()`.
contract TransformerDeployer {
    /// @dev Emitted when a contract is deployed via `deploy()`.
    /// @param deployedAddress The address of the deployed contract.
    /// @param salt The deployment salt.
    /// @param sender The caller of `deploy()`.
    event Deployed(address deployedAddress, bytes32 salt, address sender);

    // @dev The current nonce of this contract.
    uint256 public nonce = 0;
    // @dev Mapping of deployed contract address to the deployment salt.
    mapping (address => bytes32) public toDeploymentSalt;
    // @dev Mapping of deployed contract address to the init code hash.
    mapping (address => bytes32) public toInitCodeHash;

    /// @dev Deploy a new contract. Only callable by an authority.
    ///      Any attached ETH will also be forwarded.
    function deploy(bytes memory bytecode, bytes32 salt)
        public
        payable
        returns (address deployedAddress)
    {
        assembly {
            deployedAddress := create2(callvalue(), add(bytecode, 32), mload(bytecode), salt)
        }
        require(deployedAddress != address(0), 'TransformerDeployer/DEPLOY_FAILED');
        require(isDelegateCallSafe(deployedAddress), 'TransfermDeployer/UNSAFE_CODE');
        toDeploymentSalt[deployedAddress] = salt;
        toInitCodeHash[deployedAddress] = keccak256(bytecode);
        emit Deployed(deployedAddress, salt, msg.sender);
    }

    /// @dev Checks whether a given address is safe to be called via
    ///      delegatecall. A contract is considered unsafe if it includes any
    ///      of the following opcodes: CALLCODE, DELEGATECALL, SELFDESTRUCT,
    ///      SLOAD, and STORE. This code is adapted from
    ///      https://github.com/dharma-eng/dharma-smart-wallet/blob/master/contracts/helpers/IndestructibleRegistry.sol
    /// @param target The address to check.
    /// @return True if the contract is considered safe for delegatecall.
    function isDelegateCallSafe(address target) public view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(target) }
        require(size > 0, "No code at target.");

        bytes memory extcode = new bytes(size);
        assembly {
            extcodecopy(target, add(extcode, 32), 0, size)
        }

        // Look for any reachable, impermissible opcodes.
        bool reachable = true;
        for (uint256 i = 0; i < extcode.length; i++) {
            uint8 op = uint8(extcode[i]);

            // If the opcode is a PUSH, skip over the push data.
            if (op > 95 && op < 128) { // pushN
                i += (op - 95);
                continue;
            }

            if (reachable) {
                // If execution is halted, mark subsequent opcodes unreachable.
                if (
                    op == 254 || // invalid
                    op == 243 || // return
                    op == 253 || // revert
                    op == 86  || // jump
                    op == 0      // stop
                ) {
                    reachable = false;
                    continue;
                }

                // If opcode is impermissible, contract is unsafe.
                if (
                    op == 242 || // callcode
                    op == 244 || // delegatecall
                    op == 255 || // selfdestruct
                    op == 84  || // sload
                    op == 85     // sstore
                ) {
                    return false;
                }
            } else if (op == 91) { // jumpdest
                // After a JUMPDEST, opcodes are reachable again.
                reachable = true;
            }

            return true; // no unsafe opcodes found
        }
    }
}
