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

import "src/IZeroEx.sol";
import "src/ZeroEx.sol";
import "src/migrations/InitialMigration.sol";
import "src/features/OwnableFeature.sol";
import "src/features/SimpleFunctionRegistryFeature.sol";


contract DeployZeroEx is Test {
    ZeroEx public ZERO_EX = ZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF);
    IZeroEx public IZERO_EX = IZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF);

    function deployZeroEx()
        internal
    {
        // HERE BE DRAGONS, feel free to ignore this for now
        // We want to deploy the ZeroEx contract, at 0xDef1C0ded9bec7F1a1670819833240f027b25EfF

        // We use a special mechanism to deploy the ZeroEx contract.
        InitialMigration initialMigration = InitialMigration(deployCode(
            "foundry-artifacts/InitialMigration.sol/InitialMigration.json",
            abi.encode(address(this))
        ));
        // Must occur from this address as the first transaction
        hoax(0xe750ad66DE350F8110E305fb78Ec6A9f594445E3);
        // Special Deployer code
        bytes memory deployerBytecode = hex"608060405234801561001057600080fd5b506040516103da3803806103da83398101604081905261002f91610077565b8060405161003c9061006a565b610046919061011f565b604051809103906000f080158015610062573d6000803e3d6000fd5b505050610198565b6101f5806101e583390190565b600060208284031215610088578081fd5b81516001600160401b038082111561009e578283fd5b818401915084601f8301126100b1578283fd5b8151818111156100c3576100c3610182565b604051601f8201601f19908116603f011681019083821181831017156100eb576100eb610182565b81604052828152876020848701011115610103578586fd5b610114836020830160208801610152565b979650505050505050565b600060208252825180602084015261013e816040850160208701610152565b601f01601f19169190910160400192915050565b60005b8381101561016d578181015183820152602001610155565b8381111561017c576000848401525b50505050565b634e487b7160e01b600052604160045260246000fd5b603f806101a66000396000f3fe6080604052600080fdfea26469706673582212201bd8b1a777b100d67435ca4bb0b2fdccb13a2c2dde019b227bb553ff9a95bd4464736f6c63430008020033608060405234801561001057600080fd5b506040516101f53803806101f583398101604081905261002f916100c9565b60008151602083016000f090506001600160a01b0381166100865760405162461bcd60e51b815260206004820152600d60248201526c1111541313d657d19052531151609a1b604482015260640160405180910390fd5b6040516001600160a01b03821681527ff40fcec21964ffb566044d083b4073f29f7f7929110ea19e1b3ebe375d89055e9060200160405180910390a150506101a8565b600060208083850312156100db578182fd5b82516001600160401b03808211156100f1578384fd5b818501915085601f830112610104578384fd5b81518181111561011657610116610192565b604051601f8201601f19908116603f0116810190838211818310171561013e5761013e610192565b816040528281528886848701011115610155578687fd5b8693505b828410156101765784840186015181850187015292850192610159565b8284111561018657868684830101525b98975050505050505050565b634e487b7160e01b600052604160045260246000fd5b603f806101b66000396000f3fe6080604052600080fdfea2646970667358221220fbca036a163ed7f008cefa7c834d98d25109a456a051d41d9c89d55d7185d12b64736f6c63430008020033";
        // Grab the bytecode of the ZeroEx artifact
        bytes memory zeroExBytecode = vm.getCode("foundry-artifacts/ZeroEx.sol/ZeroEx.json");
        // Append the required ZeroEx constructor arguments (address bootstrapper)
        bytes memory zeroExDeploycode = abi.encodePacked(zeroExBytecode, abi.encode(initialMigration));
        // Append the required deployer code constructor arguments (bytes initCode)
        bytes memory deployerDeploycode = abi.encodePacked(deployerBytecode, abi.encode(zeroExDeploycode));
        // The address is technically emitted in an event, but we know we did it correctly
        //│   │   ├─  emit topic 0: 0xf40fcec21964ffb566044d083b4073f29f7f7929110ea19e1b3ebe375d89055e
        //│   │   │           data: 0x000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff
        assembly {
            pop(create(0, add(deployerDeploycode, 0x20), mload(deployerDeploycode)))
        }

        initialMigration.initializeZeroEx(
            payable(address(this)),
            ZERO_EX,
            InitialMigration.BootstrapFeatures({ registry: new SimpleFunctionRegistryFeature(), ownable: new OwnableFeature()})
        );
    }
}
