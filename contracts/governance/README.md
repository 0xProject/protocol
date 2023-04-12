## Governance

This package contains contracts for the ZeroEx governance of 0x Protocol and Treasury.

## Production deployment

`ZRXWrappedToken` 0xfcfaf7834f134f5146dbb3274bab9bed4bafa917
`ZeroExVotesProxy` 0x9c766e51b46cbc1fa4f8b6718ed4a60ac9d591fb
`ZeroExVotes` 0x8d208c5514b98c5b9ceed650b02df2aeb1c73e6f
Protocol `ZeroExTimelock` 0xb6a1f58c5df9f13312639cddda0d128bf28cdd87
`ZeroExProtocolGovernor` 0xc256035fe8533f9ce362012a6ae0aefed4df30f4
Treasury `ZeroExTimelock` 0x0dcfb77a581bc8fe432e904643a5480cc183f38d
`ZeroExTreasuryGovernor` 0x4822cfc1e7699bdb9551bdfd3a838ee414bc2008
Security council 0x979BDb496e5f0A00af078b7a45F1E9E6bcff170F

## Design

This implementation fully decentralises governance of 0x Protocol and Treasury. This is enabled via a wrapped ZRX token and a Compound-like governors design. There are two separate governors for Protocol - `ZeroExProtocolGovernor` and Treasury - `ZeroExTreasuryGovernor` respectively working with two separate Timelock instances of the same contract implementation - `ZeroExTimelock`.

### Upgradability
`ZRXWrappedToken` , `ZeroExProtocolGovernor` and `ZeroExTreasuryGovernor` governors are non-upgradable by design. However the voting implementation the governors use - `ZeroExVotes` is upgradable and using the OZ `ERC1967Proxy`.

### Wrapped ZRX
wZRX will be issued 1-to-1 for ZRX. No locking/vesting mechanisms will exist between wZRX and ZRX and the two will be freely interchangeable. The ZRX token is non-upgradable and same will be valid for its wrapped equivalent.

The token supports delegation which allows a user to delegate their entire voting power to another account (which doesn't necessarily need to be a token holder). This is modelled on the standard OpenZeppelin `ERC20Votes` implementation. We have added logic for block number stamping delegators' balance changes stored in the `DelegateInfo.balanceLastUpdated` property. This block number information is sent in calls to `ZeroExVotes.moveVotingPower` in order to provide support for future upgrades to the vote power calculation.
Note that for consistency `block.number` is used for the governor settings, voting checkpoints and this delegators' balance last updated property while timelock logic for the governor uses block.timestamp.

### Governors' settings
Changing governors' settings for `votingDelay`, `votingPeriod` and `proposalThreshold` can be done via the normal proposal mechanism. Governors are deployed with the following initial settings:

|                                | voting delay | voting period | proposal threshold |
|-------------------|--------------|---------------|--------------------|
| Protocol governor | 2 days            | 7 days             |  1000000e18           |
| Treasury governor | 2 days           |  7 days             |   250000e18          |


This is using standard openzeppelin `GovernorSettings` implementation.

### Quorum
Quorum for Protocol is fixed at 10m (10000000e18) while for Treasury this is calculated as 10% of voting power of the total supply (see voting strategies below for quadratic voting power implementation specifics). The quorum calculations for Treasury are using OpenZeppelin's `GovernorVotesQuorumFraction`.

Note that in-place updates to the quorum are not supported and will need to go through a governance upgrade. Reasoning behind this can be found in this discussion https://forum.openzeppelin.com/t/quorum-default-behaviour-on-governors/34560.

### Voting strategies
The voting strategy will be linear 1-token-1-vote for Protocol and quadratic with threshold of 1000000e18 for Treasury (i.e. voting weight is linear up to 1m tokens and balance above that threshold is quadratic).

Worth noting is the `Checkpoint` struct design. For packing every `Checkpoint` into a single storage slot we are using the minimum uint type size for `votes` and `quadraticVotes` members, e.g.

```
struct Checkpoint {
        uint32 fromBlock;
        uint96 votes;
        uint96 quadraticVotes;
    }
```

since the maximum token supply is 1bn we can have maximum value for:
`votes` : 1bn *10^18 => can be stored in 90 bits
`quadraticVotes` : due to the likelihood of threshold changing and potentially bringing it closer to a linear vote, we are preemptively keeping this to the same size as linear votes slot.

### Time locks
Governance proposals are subject to a 3 days delay for Protocol and 2 days for Treasury. This delay allows Security Council time to review passed proposals and take action where needed.

### Security Council
The concept of a Security council is introduced which allows a multisig of security council members to cancel a proposal on the treasury or protocol governors and also rollback the protocol to an earlier version.

When no security council is assigned the following apply:

- ongoing proposals can still be voted on
- new proposals cannot be created - except assignSecurityCouncil
- expired proposals that are successful cannot be queued - excepted assignSecurityCouncil

There is a provision for the governors to have different security council set although initially these are the same.
