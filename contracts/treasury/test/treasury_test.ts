import { artifacts as assetProxyArtifacts, ERC20ProxyContract } from '@0x/contracts-asset-proxy';
import { artifacts as erc20Artifacts, DummyERC20TokenContract } from '@0x/contracts-erc20';
import {
    artifacts as stakingArtifacts,
    constants as stakingConstants,
    StakeInfo,
    StakeStatus,
    StakingProxyContract,
    TestStakingContract,
    ZrxVaultContract,
} from '@0x/contracts-staking';
import {
    blockchainTests,
    constants,
    expect,
    getRandomInteger,
    randomAddress,
    verifyEventsFromLogs,
} from '@0x/contracts-test-utils';
import { TreasuryVote } from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import * as ethUtil from 'ethereumjs-util';

import { artifacts } from './artifacts';
import { DefaultPoolOperatorContract, ZrxTreasuryContract, ZrxTreasuryEvents } from './wrappers';

blockchainTests.resets('Treasury governance', env => {
    const TREASURY_PARAMS = {
        votingPeriod: new BigNumber(3).times(stakingConstants.ONE_DAY_IN_SECONDS),
        proposalThreshold: new BigNumber(100),
        quorumThreshold: new BigNumber(1000),
        defaultPoolId: stakingConstants.INITIAL_POOL_ID,
    };
    const PROPOSAL_DESCRIPTION = 'A very compelling proposal!';
    const TREASURY_BALANCE = constants.INITIAL_ERC20_BALANCE;
    const INVALID_PROPOSAL_ID = new BigNumber(999);
    const GRANT_PROPOSALS = [
        { recipient: randomAddress(), amount: getRandomInteger(1, TREASURY_BALANCE.dividedToIntegerBy(2)) },
        { recipient: randomAddress(), amount: getRandomInteger(1, TREASURY_BALANCE.dividedToIntegerBy(2)) },
    ];

    interface ProposedAction {
        target: string;
        data: string;
        value: BigNumber;
    }

    let zrx: DummyERC20TokenContract;
    let weth: DummyERC20TokenContract;
    let erc20ProxyContract: ERC20ProxyContract;
    let staking: TestStakingContract;
    let treasury: ZrxTreasuryContract;
    let defaultPoolId: string;
    let defaultPoolOperator: DefaultPoolOperatorContract;
    let admin: string;
    let nonDefaultPoolId: string;
    let poolOperator: string;
    let delegator: string;
    let relayer: string;
    let delegatorPrivateKey: string;
    let actions: ProposedAction[];

    async function deployStakingAsync(): Promise<void> {
        erc20ProxyContract = await ERC20ProxyContract.deployFrom0xArtifactAsync(
            assetProxyArtifacts.ERC20Proxy,
            env.provider,
            env.txDefaults,
            assetProxyArtifacts,
        );
        const zrxVaultContract = await ZrxVaultContract.deployFrom0xArtifactAsync(
            stakingArtifacts.ZrxVault,
            env.provider,
            env.txDefaults,
            stakingArtifacts,
            erc20ProxyContract.address,
            zrx.address,
        );
        await erc20ProxyContract.addAuthorizedAddress(zrxVaultContract.address).awaitTransactionSuccessAsync();
        await zrxVaultContract.addAuthorizedAddress(admin).awaitTransactionSuccessAsync();
        const stakingLogic = await TestStakingContract.deployFrom0xArtifactAsync(
            stakingArtifacts.TestStaking,
            env.provider,
            env.txDefaults,
            artifacts,
            weth.address,
            zrxVaultContract.address,
        );
        const stakingProxyContract = await StakingProxyContract.deployFrom0xArtifactAsync(
            stakingArtifacts.StakingProxy,
            env.provider,
            env.txDefaults,
            artifacts,
            stakingLogic.address,
        );
        await stakingProxyContract.addAuthorizedAddress(admin).awaitTransactionSuccessAsync();
        await zrxVaultContract.setStakingProxy(stakingProxyContract.address).awaitTransactionSuccessAsync();
        staking = new TestStakingContract(stakingProxyContract.address, env.provider, env.txDefaults);
    }

    async function fastForwardToNextEpochAsync(): Promise<void> {
        const epochEndTime = await staking.getCurrentEpochEarliestEndTimeInSeconds().callAsync();
        const lastBlockTime = await env.web3Wrapper.getBlockTimestampAsync('latest');
        const dt = Math.max(0, epochEndTime.minus(lastBlockTime).toNumber());
        await env.web3Wrapper.increaseTimeAsync(dt);
        // mine next block
        await env.web3Wrapper.mineBlockAsync();
        await staking.endEpoch().awaitTransactionSuccessAsync();
    }

    before(async () => {
        const accounts = await env.getAccountAddressesAsync();
        [admin, poolOperator, delegator, relayer] = accounts;
        delegatorPrivateKey = hexUtils.toHex(constants.TESTRPC_PRIVATE_KEYS[accounts.indexOf(delegator)]);

        zrx = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
            erc20Artifacts.DummyERC20Token,
            env.provider,
            env.txDefaults,
            erc20Artifacts,
            constants.DUMMY_TOKEN_NAME,
            constants.DUMMY_TOKEN_SYMBOL,
            constants.DUMMY_TOKEN_DECIMALS,
            constants.DUMMY_TOKEN_TOTAL_SUPPLY,
        );
        weth = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
            erc20Artifacts.DummyERC20Token,
            env.provider,
            env.txDefaults,
            erc20Artifacts,
            constants.DUMMY_TOKEN_NAME,
            constants.DUMMY_TOKEN_SYMBOL,
            constants.DUMMY_TOKEN_DECIMALS,
            constants.DUMMY_TOKEN_TOTAL_SUPPLY,
        );
        await deployStakingAsync();
        await zrx.mint(constants.INITIAL_ERC20_BALANCE).awaitTransactionSuccessAsync({ from: poolOperator });
        await zrx.mint(constants.INITIAL_ERC20_BALANCE).awaitTransactionSuccessAsync({ from: delegator });
        await zrx
            .approve(erc20ProxyContract.address, constants.INITIAL_ERC20_ALLOWANCE)
            .awaitTransactionSuccessAsync({ from: poolOperator });
        await zrx
            .approve(erc20ProxyContract.address, constants.INITIAL_ERC20_ALLOWANCE)
            .awaitTransactionSuccessAsync({ from: delegator });

        defaultPoolOperator = await DefaultPoolOperatorContract.deployFrom0xArtifactAsync(
            artifacts.DefaultPoolOperator,
            env.provider,
            env.txDefaults,
            { ...artifacts, ...erc20Artifacts },
            staking.address,
            weth.address,
        );
        defaultPoolId = stakingConstants.INITIAL_POOL_ID;

        const createStakingPoolTx = staking.createStakingPool(stakingConstants.PPM, false);
        nonDefaultPoolId = await createStakingPoolTx.callAsync({ from: poolOperator });
        await createStakingPoolTx.awaitTransactionSuccessAsync({ from: poolOperator });

        treasury = await ZrxTreasuryContract.deployFrom0xArtifactAsync(
            artifacts.ZrxTreasury,
            env.provider,
            env.txDefaults,
            { ...artifacts, ...erc20Artifacts },
            staking.address,
            TREASURY_PARAMS,
        );

        await zrx.mint(TREASURY_BALANCE).awaitTransactionSuccessAsync();
        await zrx.transfer(treasury.address, TREASURY_BALANCE).awaitTransactionSuccessAsync();
        actions = [
            {
                target: zrx.address,
                data: zrx
                    .transfer(GRANT_PROPOSALS[0].recipient, GRANT_PROPOSALS[0].amount)
                    .getABIEncodedTransactionData(),
                value: constants.ZERO_AMOUNT,
            },
            {
                target: zrx.address,
                data: zrx
                    .transfer(GRANT_PROPOSALS[1].recipient, GRANT_PROPOSALS[1].amount)
                    .getABIEncodedTransactionData(),
                value: constants.ZERO_AMOUNT,
            },
        ];
    });
    describe('getVotingPower()', () => {
        it('Unstaked ZRX has no voting power', async () => {
            const votingPower = await treasury.getVotingPower(delegator, []).callAsync();
            expect(votingPower).to.bignumber.equal(0);
        });
        it('Staked but undelegated ZRX has no voting power', async () => {
            await staking.stake(constants.INITIAL_ERC20_BALANCE).awaitTransactionSuccessAsync({ from: delegator });
            const votingPower = await treasury.getVotingPower(delegator, []).callAsync();
            expect(votingPower).to.bignumber.equal(0);
        });
        it('ZRX delegated during epoch N has no voting power during Epoch N', async () => {
            await staking.stake(TREASURY_PARAMS.proposalThreshold).awaitTransactionSuccessAsync({ from: delegator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, defaultPoolId),
                    TREASURY_PARAMS.proposalThreshold,
                )
                .awaitTransactionSuccessAsync({ from: delegator });
            const votingPower = await treasury.getVotingPower(delegator, []).callAsync();
            expect(votingPower).to.bignumber.equal(0);
            await fastForwardToNextEpochAsync();
        });
        it('ZRX delegated to the default pool retains full voting power', async () => {
            await staking.stake(TREASURY_PARAMS.proposalThreshold).awaitTransactionSuccessAsync({ from: delegator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, defaultPoolId),
                    TREASURY_PARAMS.proposalThreshold,
                )
                .awaitTransactionSuccessAsync({ from: delegator });
            await fastForwardToNextEpochAsync();
            const votingPower = await treasury.getVotingPower(delegator, []).callAsync();
            expect(votingPower).to.bignumber.equal(TREASURY_PARAMS.proposalThreshold);
        });
        it('ZRX delegated to a non-default pool splits voting power between delegator and pool operator', async () => {
            await staking.stake(TREASURY_PARAMS.proposalThreshold).awaitTransactionSuccessAsync({ from: delegator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, nonDefaultPoolId),
                    TREASURY_PARAMS.proposalThreshold,
                )
                .awaitTransactionSuccessAsync({ from: delegator });
            await fastForwardToNextEpochAsync();
            const delegatorVotingPower = await treasury.getVotingPower(delegator, []).callAsync();
            expect(delegatorVotingPower).to.bignumber.equal(TREASURY_PARAMS.proposalThreshold.dividedBy(2));
            const operatorVotingPower = await treasury.getVotingPower(poolOperator, [nonDefaultPoolId]).callAsync();
            expect(operatorVotingPower).to.bignumber.equal(TREASURY_PARAMS.proposalThreshold.dividedBy(2));
        });
        it('Reverts if given duplicate pool IDs', async () => {
            await staking.stake(TREASURY_PARAMS.proposalThreshold).awaitTransactionSuccessAsync({ from: delegator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, nonDefaultPoolId),
                    TREASURY_PARAMS.proposalThreshold,
                )
                .awaitTransactionSuccessAsync({ from: delegator });
            await fastForwardToNextEpochAsync();
            const tx = treasury.getVotingPower(poolOperator, [nonDefaultPoolId, nonDefaultPoolId]).callAsync();
            return expect(tx).to.revertWith('getVotingPower/DUPLICATE_POOL_ID');
        });
        it('Correctly sums voting power delegated to multiple pools', async () => {
            await staking
                .stake(TREASURY_PARAMS.proposalThreshold.times(2))
                .awaitTransactionSuccessAsync({ from: delegator });
            // Delegate half of total stake to the default pool.
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, defaultPoolId),
                    TREASURY_PARAMS.proposalThreshold,
                )
                .awaitTransactionSuccessAsync({ from: delegator });
            // Delegate the other half to a non-default pool.
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, nonDefaultPoolId),
                    TREASURY_PARAMS.proposalThreshold,
                )
                .awaitTransactionSuccessAsync({ from: delegator });
            await fastForwardToNextEpochAsync();
            const delegatorVotingPower = await treasury.getVotingPower(delegator, []).callAsync();
            expect(delegatorVotingPower).to.bignumber.equal(TREASURY_PARAMS.proposalThreshold.times(1.5));
        });
        it('Correctly sums voting power for operator with multiple pools', async () => {
            const createStakingPoolTx = staking.createStakingPool(stakingConstants.PPM, false);
            const firstPool = nonDefaultPoolId;
            const secondPool = await createStakingPoolTx.callAsync({ from: poolOperator });
            await createStakingPoolTx.awaitTransactionSuccessAsync({ from: poolOperator });

            const amountDelegatedToDefaultPool = new BigNumber(1337);
            const amountSelfDelegatedToFirstPool = new BigNumber(420);
            const amountExternallyDelegatedToSecondPool = new BigNumber(2020);

            await staking
                .stake(amountDelegatedToDefaultPool.plus(amountSelfDelegatedToFirstPool))
                .awaitTransactionSuccessAsync({ from: poolOperator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, defaultPoolId),
                    amountDelegatedToDefaultPool,
                )
                .awaitTransactionSuccessAsync({ from: poolOperator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, firstPool),
                    amountSelfDelegatedToFirstPool,
                )
                .awaitTransactionSuccessAsync({ from: poolOperator });
            await staking
                .stake(amountExternallyDelegatedToSecondPool)
                .awaitTransactionSuccessAsync({ from: delegator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, secondPool),
                    amountExternallyDelegatedToSecondPool,
                )
                .awaitTransactionSuccessAsync({ from: delegator });

            await fastForwardToNextEpochAsync();
            const votingPower = await treasury.getVotingPower(poolOperator, [firstPool, secondPool]).callAsync();
            expect(votingPower).to.bignumber.equal(
                amountDelegatedToDefaultPool
                    .plus(amountSelfDelegatedToFirstPool)
                    .plus(amountExternallyDelegatedToSecondPool.dividedToIntegerBy(2)),
            );
        });
    });
    describe('propose()', () => {
        it('Cannot create proposal without sufficient voting power', async () => {
            const votingPower = TREASURY_PARAMS.proposalThreshold.minus(1);
            await staking.stake(votingPower).awaitTransactionSuccessAsync({ from: delegator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, defaultPoolId),
                    votingPower,
                )
                .awaitTransactionSuccessAsync({ from: delegator });
            await fastForwardToNextEpochAsync();
            const currentEpoch = await staking.currentEpoch().callAsync();
            const tx = treasury
                .propose(actions, currentEpoch.plus(2), PROPOSAL_DESCRIPTION, [])
                .awaitTransactionSuccessAsync({ from: delegator });
            return expect(tx).to.revertWith('propose/INSUFFICIENT_VOTING_POWER');
        });
        it('Cannot create proposal with no actions', async () => {
            const votingPower = TREASURY_PARAMS.proposalThreshold;
            await staking.stake(votingPower).awaitTransactionSuccessAsync({ from: delegator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, defaultPoolId),
                    votingPower,
                )
                .awaitTransactionSuccessAsync({ from: delegator });
            await fastForwardToNextEpochAsync();
            const currentEpoch = await staking.currentEpoch().callAsync();
            const tx = treasury
                .propose([], currentEpoch.plus(2), PROPOSAL_DESCRIPTION, [])
                .awaitTransactionSuccessAsync({ from: delegator });
            return expect(tx).to.revertWith('propose/NO_ACTIONS_PROPOSED');
        });
        it('Cannot create proposal with an invalid execution epoch', async () => {
            const votingPower = TREASURY_PARAMS.proposalThreshold;
            await staking.stake(votingPower).awaitTransactionSuccessAsync({ from: delegator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, defaultPoolId),
                    votingPower,
                )
                .awaitTransactionSuccessAsync({ from: delegator });
            await fastForwardToNextEpochAsync();
            const currentEpoch = await staking.currentEpoch().callAsync();
            const tx = treasury
                .propose(actions, currentEpoch.plus(1), PROPOSAL_DESCRIPTION, [])
                .awaitTransactionSuccessAsync({ from: delegator });
            return expect(tx).to.revertWith('propose/INVALID_EXECUTION_EPOCH');
        });
        it('Can create a valid proposal', async () => {
            const votingPower = TREASURY_PARAMS.proposalThreshold;
            await staking.stake(votingPower).awaitTransactionSuccessAsync({ from: delegator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, defaultPoolId),
                    votingPower,
                )
                .awaitTransactionSuccessAsync({ from: delegator });
            await fastForwardToNextEpochAsync();
            const currentEpoch = await staking.currentEpoch().callAsync();
            const executionEpoch = currentEpoch.plus(2);
            const tx = await treasury
                .propose(actions, executionEpoch, PROPOSAL_DESCRIPTION, [])
                .awaitTransactionSuccessAsync({ from: delegator });
            const proposalId = new BigNumber(0);
            verifyEventsFromLogs(
                tx.logs,
                [
                    {
                        proposer: delegator,
                        operatedPoolIds: [],
                        proposalId,
                        actions,
                        executionEpoch,
                        description: PROPOSAL_DESCRIPTION,
                    },
                ],
                ZrxTreasuryEvents.ProposalCreated,
            );
            expect(await treasury.proposalCount().callAsync()).to.bignumber.equal(1);
        });
    });
    describe('castVote() and castVoteBySignature()', () => {
        const VOTE_PROPOSAL_ID = new BigNumber(0);
        const DELEGATOR_VOTING_POWER = new BigNumber(420);

        before(async () => {
            await staking.stake(DELEGATOR_VOTING_POWER).awaitTransactionSuccessAsync({ from: delegator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, defaultPoolId),
                    DELEGATOR_VOTING_POWER,
                )
                .awaitTransactionSuccessAsync({ from: delegator });
            await fastForwardToNextEpochAsync();
            const currentEpoch = await staking.currentEpoch().callAsync();
            await treasury
                .propose(actions, currentEpoch.plus(2), PROPOSAL_DESCRIPTION, [])
                .awaitTransactionSuccessAsync({ from: delegator });
        });
        // castVote()
        it('Cannot vote on invalid proposalId', async () => {
            await fastForwardToNextEpochAsync();
            await fastForwardToNextEpochAsync();
            const tx = treasury
                .castVote(INVALID_PROPOSAL_ID, true, [])
                .awaitTransactionSuccessAsync({ from: delegator });
            return expect(tx).to.revertWith('_castVote/INVALID_PROPOSAL_ID');
        });
        it('Cannot vote before voting period starts', async () => {
            const tx = treasury.castVote(VOTE_PROPOSAL_ID, true, []).awaitTransactionSuccessAsync({ from: delegator });
            return expect(tx).to.revertWith('_castVote/VOTING_IS_CLOSED');
        });
        it('Cannot vote after voting period ends', async () => {
            await fastForwardToNextEpochAsync();
            await fastForwardToNextEpochAsync();
            await env.web3Wrapper.increaseTimeAsync(TREASURY_PARAMS.votingPeriod.plus(1).toNumber());
            await env.web3Wrapper.mineBlockAsync();
            const tx = treasury.castVote(VOTE_PROPOSAL_ID, true, []).awaitTransactionSuccessAsync({ from: delegator });
            return expect(tx).to.revertWith('_castVote/VOTING_IS_CLOSED');
        });
        it('Cannot vote twice on same proposal', async () => {
            await fastForwardToNextEpochAsync();
            await fastForwardToNextEpochAsync();
            await treasury.castVote(VOTE_PROPOSAL_ID, true, []).awaitTransactionSuccessAsync({ from: delegator });
            const tx = treasury.castVote(VOTE_PROPOSAL_ID, false, []).awaitTransactionSuccessAsync({ from: delegator });
            return expect(tx).to.revertWith('_castVote/ALREADY_VOTED');
        });
        it('Can cast a valid vote', async () => {
            await fastForwardToNextEpochAsync();
            await fastForwardToNextEpochAsync();
            const tx = await treasury
                .castVote(VOTE_PROPOSAL_ID, true, [])
                .awaitTransactionSuccessAsync({ from: delegator });
            verifyEventsFromLogs(
                tx.logs,
                [
                    {
                        voter: delegator,
                        operatedPoolIds: [],
                        proposalId: VOTE_PROPOSAL_ID,
                        support: true,
                        votingPower: DELEGATOR_VOTING_POWER,
                    },
                ],
                ZrxTreasuryEvents.VoteCast,
            );
        });
        // castVoteBySignature()
        it('Cannot vote by signature on invalid proposalId', async () => {
            await fastForwardToNextEpochAsync();
            await fastForwardToNextEpochAsync();
            const vote = new TreasuryVote({
                proposalId: INVALID_PROPOSAL_ID,
                verifyingContract: admin,
            });
            const signature = vote.getSignatureWithKey(delegatorPrivateKey);
            const tx = treasury
                .castVoteBySignature(INVALID_PROPOSAL_ID, true, [], signature.v, signature.r, signature.s)
                .awaitTransactionSuccessAsync({ from: relayer });
            return expect(tx).to.revertWith('_castVote/INVALID_PROPOSAL_ID');
        });
        it('Cannot vote by signature before voting period starts', async () => {
            const vote = new TreasuryVote({
                proposalId: VOTE_PROPOSAL_ID,
                verifyingContract: admin,
            });
            const signature = vote.getSignatureWithKey(delegatorPrivateKey);
            const tx = treasury
                .castVoteBySignature(VOTE_PROPOSAL_ID, true, [], signature.v, signature.r, signature.s)
                .awaitTransactionSuccessAsync({ from: relayer });
            return expect(tx).to.revertWith('_castVote/VOTING_IS_CLOSED');
        });
        it('Cannot vote by signature after voting period ends', async () => {
            await fastForwardToNextEpochAsync();
            await fastForwardToNextEpochAsync();
            await env.web3Wrapper.increaseTimeAsync(TREASURY_PARAMS.votingPeriod.plus(1).toNumber());
            await env.web3Wrapper.mineBlockAsync();

            const vote = new TreasuryVote({
                proposalId: VOTE_PROPOSAL_ID,
                verifyingContract: admin,
            });
            const signature = vote.getSignatureWithKey(delegatorPrivateKey);
            const tx = treasury
                .castVoteBySignature(VOTE_PROPOSAL_ID, true, [], signature.v, signature.r, signature.s)
                .awaitTransactionSuccessAsync({ from: relayer });
            return expect(tx).to.revertWith('_castVote/VOTING_IS_CLOSED');
        });
        it('Can recover the address from signature correctly', async () => {
            const vote = new TreasuryVote({
                proposalId: VOTE_PROPOSAL_ID,
                verifyingContract: admin,
            });
            const signature = vote.getSignatureWithKey(delegatorPrivateKey);
            const publicKey = ethUtil.ecrecover(
                ethUtil.toBuffer(vote.getEIP712Hash()),
                signature.v,
                ethUtil.toBuffer(signature.r),
                ethUtil.toBuffer(signature.s),
            );
            const address = ethUtil.publicToAddress(publicKey);

            expect(ethUtil.bufferToHex(address)).to.be.equal(delegator);
        });
        it('Can cast a valid vote by signature', async () => {
            await fastForwardToNextEpochAsync();
            await fastForwardToNextEpochAsync();

            const vote = new TreasuryVote({
                proposalId: VOTE_PROPOSAL_ID,
                verifyingContract: treasury.address,
                chainId: 1337,
                support: false,
            });
            const signature = vote.getSignatureWithKey(delegatorPrivateKey);
            const tx = await treasury
                .castVoteBySignature(VOTE_PROPOSAL_ID, false, [], signature.v, signature.r, signature.s)
                .awaitTransactionSuccessAsync({ from: relayer });

            verifyEventsFromLogs(
                tx.logs,
                [
                    {
                        voter: delegator,
                        operatedPoolIds: [],
                        proposalId: VOTE_PROPOSAL_ID,
                        support: vote.support,
                        votingPower: DELEGATOR_VOTING_POWER,
                    },
                ],
                ZrxTreasuryEvents.VoteCast,
            );
        });
        it('Cannot vote by signature twice on same proposal', async () => {
            await fastForwardToNextEpochAsync();
            await fastForwardToNextEpochAsync();
            await treasury.castVote(VOTE_PROPOSAL_ID, true, []).awaitTransactionSuccessAsync({ from: delegator });

            const secondVote = new TreasuryVote({
                proposalId: VOTE_PROPOSAL_ID,
                verifyingContract: treasury.address,
                chainId: 1337,
                support: false,
            });
            const signature = secondVote.getSignatureWithKey(delegatorPrivateKey);
            const secondVoteTx = treasury
                .castVoteBySignature(VOTE_PROPOSAL_ID, false, [], signature.v, signature.r, signature.s)
                .awaitTransactionSuccessAsync({ from: relayer });
            return expect(secondVoteTx).to.revertWith('_castVote/ALREADY_VOTED');
        });
    });
    describe('execute()', () => {
        let passedProposalId: BigNumber;
        let failedProposalId: BigNumber;
        let defeatedProposalId: BigNumber;
        let ongoingVoteProposalId: BigNumber;

        before(async () => {
            // Operator has enough ZRX to create and pass a proposal
            await staking.stake(TREASURY_PARAMS.quorumThreshold).awaitTransactionSuccessAsync({ from: poolOperator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, defaultPoolId),
                    TREASURY_PARAMS.quorumThreshold,
                )
                .awaitTransactionSuccessAsync({ from: poolOperator });
            // Delegator only has enough ZRX to create a proposal
            await staking.stake(TREASURY_PARAMS.proposalThreshold).awaitTransactionSuccessAsync({ from: delegator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, defaultPoolId),
                    TREASURY_PARAMS.proposalThreshold,
                )
                .awaitTransactionSuccessAsync({ from: delegator });
            await fastForwardToNextEpochAsync();
            const currentEpoch = await staking.currentEpoch().callAsync();
            // Proposal 0
            let tx = treasury.propose(actions, currentEpoch.plus(4), PROPOSAL_DESCRIPTION, []);
            passedProposalId = await tx.callAsync({ from: delegator });
            await tx.awaitTransactionSuccessAsync({ from: delegator });
            // Proposal 1
            tx = treasury.propose(actions, currentEpoch.plus(3), PROPOSAL_DESCRIPTION, []);
            failedProposalId = await tx.callAsync({ from: delegator });
            await tx.awaitTransactionSuccessAsync({ from: delegator });
            // Proposal 2
            tx = treasury.propose(actions, currentEpoch.plus(3), PROPOSAL_DESCRIPTION, []);
            defeatedProposalId = await tx.callAsync({ from: delegator });
            await tx.awaitTransactionSuccessAsync({ from: delegator });

            await fastForwardToNextEpochAsync();
            // Proposal 3
            tx = treasury.propose(actions, currentEpoch.plus(3), PROPOSAL_DESCRIPTION, []);
            ongoingVoteProposalId = await tx.callAsync({ from: delegator });
            await tx.awaitTransactionSuccessAsync({ from: delegator });

            await fastForwardToNextEpochAsync();
            /********** Start Vote Epoch for Proposals 0, 1, 2 **********/
            // Proposal 0 passes
            await treasury.castVote(passedProposalId, true, []).awaitTransactionSuccessAsync({ from: poolOperator });
            // Proposal 1 fails to reach quorum
            await treasury.castVote(failedProposalId, true, []).awaitTransactionSuccessAsync({ from: delegator });
            // Proposal 2 is voted down
            await treasury.castVote(defeatedProposalId, true, []).awaitTransactionSuccessAsync({ from: delegator });
            await treasury.castVote(defeatedProposalId, false, []).awaitTransactionSuccessAsync({ from: poolOperator });
            /********** End Vote Epoch for Proposals 0, 1, 2 **********/

            await fastForwardToNextEpochAsync();
            /********** Start Execution Epoch for Proposals 1, 2, 3 **********/
            /********** Start Vote Epoch for Proposal 3 **********************/
            // Proposal 3 has enough votes to pass, but the vote is ongoing
            await treasury
                .castVote(ongoingVoteProposalId, true, [])
                .awaitTransactionSuccessAsync({ from: poolOperator });
        });
        it('Cannot execute an invalid proposalId', async () => {
            const tx = treasury.execute(INVALID_PROPOSAL_ID, actions).awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith('execute/INVALID_PROPOSAL_ID');
        });
        it('Cannot execute a proposal whose vote is ongoing', async () => {
            const tx = treasury.execute(ongoingVoteProposalId, actions).awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith('_assertProposalExecutable/PROPOSAL_HAS_NOT_PASSED');
        });
        it('Cannot execute a proposal that failed to reach quorum', async () => {
            const tx = treasury.execute(failedProposalId, actions).awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith('_assertProposalExecutable/PROPOSAL_HAS_NOT_PASSED');
        });
        it('Cannot execute a proposal that was defeated in its vote', async () => {
            const tx = treasury.execute(defeatedProposalId, actions).awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith('_assertProposalExecutable/PROPOSAL_HAS_NOT_PASSED');
        });
        it('Cannot execute before or after the execution epoch', async () => {
            const tooEarly = treasury.execute(passedProposalId, actions).awaitTransactionSuccessAsync();
            await expect(tooEarly).to.revertWith('_assertProposalExecutable/CANNOT_EXECUTE_THIS_EPOCH');
            await fastForwardToNextEpochAsync();
            // Proposal 0 is executable here
            await fastForwardToNextEpochAsync();
            const tooLate = treasury.execute(passedProposalId, actions).awaitTransactionSuccessAsync();
            return expect(tooLate).to.revertWith('_assertProposalExecutable/CANNOT_EXECUTE_THIS_EPOCH');
        });
        it('Cannot execute the same proposal twice', async () => {
            await fastForwardToNextEpochAsync();
            await treasury.execute(passedProposalId, actions).awaitTransactionSuccessAsync();
            const tx = treasury.execute(passedProposalId, actions).awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith('_assertProposalExecutable/PROPOSAL_ALREADY_EXECUTED');
        });
        it('Cannot execute actions that do not match the proposal `actionsHash`', async () => {
            await fastForwardToNextEpochAsync();
            const tx = treasury
                .execute(passedProposalId, [
                    {
                        target: zrx.address,
                        data: zrx.transfer(randomAddress(), GRANT_PROPOSALS[0].amount).getABIEncodedTransactionData(),
                        value: constants.ZERO_AMOUNT,
                    },
                ])
                .awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith('_assertProposalExecutable/INVALID_ACTIONS');
        });
        it('Can execute a valid proposal', async () => {
            await fastForwardToNextEpochAsync();
            const tx = await treasury.execute(passedProposalId, actions).awaitTransactionSuccessAsync();
            verifyEventsFromLogs(tx.logs, [{ proposalId: passedProposalId }], ZrxTreasuryEvents.ProposalExecuted);
            expect(await zrx.balanceOf(GRANT_PROPOSALS[0].recipient).callAsync()).to.bignumber.equal(
                GRANT_PROPOSALS[0].amount,
            );
            expect(await zrx.balanceOf(GRANT_PROPOSALS[1].recipient).callAsync()).to.bignumber.equal(
                GRANT_PROPOSALS[1].amount,
            );
        });
    });
    describe('Default pool operator contract', () => {
        it('Returns WETH to the staking proxy', async () => {
            const wethAmount = new BigNumber(1337);
            await weth.mint(wethAmount).awaitTransactionSuccessAsync();
            // Some amount of WETH ends up in the default pool operator
            // contract, e.g. from errant staking rewards.
            await weth.transfer(defaultPoolOperator.address, wethAmount).awaitTransactionSuccessAsync();
            // This function should send all the WETH to the staking proxy.
            await defaultPoolOperator.returnStakingRewards().awaitTransactionSuccessAsync();
            expect(await weth.balanceOf(defaultPoolOperator.address).callAsync()).to.bignumber.equal(0);
            expect(await weth.balanceOf(staking.address).callAsync()).to.bignumber.equal(wethAmount);
        });
    });
    describe('Can update thresholds via proposal', () => {
        it('Updates proposal and quorum thresholds', async () => {
            // Delegator has enough ZRX to create and pass a proposal
            await staking.stake(TREASURY_PARAMS.quorumThreshold).awaitTransactionSuccessAsync({ from: delegator });
            await staking
                .moveStake(
                    new StakeInfo(StakeStatus.Undelegated),
                    new StakeInfo(StakeStatus.Delegated, defaultPoolId),
                    TREASURY_PARAMS.quorumThreshold,
                )
                .awaitTransactionSuccessAsync({ from: delegator });
            await fastForwardToNextEpochAsync();
            const currentEpoch = await staking.currentEpoch().callAsync();
            const newProposalThreshold = new BigNumber(420);
            const newQuorumThreshold = new BigNumber(1337);
            const updateThresholdsAction = {
                target: treasury.address,
                data: treasury
                    .updateThresholds(newProposalThreshold, newQuorumThreshold)
                    .getABIEncodedTransactionData(),
                value: constants.ZERO_AMOUNT,
            };
            const tx = treasury.propose(
                [updateThresholdsAction],
                currentEpoch.plus(3),
                `Updates proposal threshold to ${newProposalThreshold} and quorum threshold to ${newQuorumThreshold}`,
                [],
            );
            const proposalId = await tx.callAsync({ from: delegator });
            await tx.awaitTransactionSuccessAsync({ from: delegator });
            await fastForwardToNextEpochAsync();
            await fastForwardToNextEpochAsync();
            await treasury.castVote(proposalId, true, []).awaitTransactionSuccessAsync({ from: delegator });
            await fastForwardToNextEpochAsync();
            await treasury
                .execute(proposalId, [updateThresholdsAction])
                .awaitTransactionSuccessAsync({ from: delegator });
            const proposalThreshold = await treasury.proposalThreshold().callAsync();
            const quorumThreshold = await treasury.quorumThreshold().callAsync();
            expect(proposalThreshold).to.bignumber.equal(newProposalThreshold);
            expect(quorumThreshold).to.bignumber.equal(newQuorumThreshold);
        });
    });
});
