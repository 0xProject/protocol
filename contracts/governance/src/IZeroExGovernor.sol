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

import "./IZeroExSecurityCouncil.sol";
import "@openzeppelin/governance/IGovernor.sol";
import "@openzeppelin/governance/extensions/IGovernorTimelock.sol";

abstract contract IZeroExGovernor is IZeroExSecurityCouncil, IGovernor, IGovernorTimelock {
    function token() public virtual returns (address);

    function proposalThreshold() public view virtual returns (uint256);

    function setVotingDelay(uint256 newVotingDelay) public virtual;

    function setVotingPeriod(uint256 newVotingPeriod) public virtual;

    function setProposalThreshold(uint256 newProposalThreshold) public virtual;

    function proposalVotes(
        uint256 proposalId
    ) public view virtual returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes);
}
