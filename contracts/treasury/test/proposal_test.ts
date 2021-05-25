import { artifacts as erc20Artifacts, ERC20TokenEvents } from '@0x/contracts-erc20';
import { StakingContract, StakingProxyContract } from '@0x/contracts-staking';
import { blockchainTests, constants, verifyEventsFromLogs } from '@0x/contracts-test-utils';
import { BigNumber, hexUtils, logUtils } from '@0x/utils';
import * as _ from 'lodash';

import { proposals } from '../src/proposals';

import { artifacts } from './artifacts';
import { ZrxTreasuryContract, ZrxTreasuryEvents } from './wrappers';

const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/mzhu25/zeroex-staking';
const STAKING_PROXY_ADDRESS = '0xa26e80e7dea86279c6d778d702cc413e6cffa777';
const TREASURY_ADDRESS = '0x0bb1810061c2f5b2088054ee184e6c79e1591101';
const PROPOSER = process.env.PROPOSER || constants.NULL_ADDRESS;
const VOTER = '0xba4f44e774158408e2dc6c5cb65bc995f0a89180';
const VOTER_OPERATED_POOLS = ['0x0000000000000000000000000000000000000000000000000000000000000017'];
blockchainTests.configure({
    fork: {
        unlockedAccounts: [PROPOSER, VOTER],
    },
});

async function querySubgraphAsync(operatorAddress: string): Promise<string[]> {
    const query = `
        {
            stakingActor(id: "${operatorAddress}") {
                operatedPools {
                    id
                }
            }
        }
    `;
    const response = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query,
        }),
    });
    const {
        data: { stakingActor },
    } = await response.json();
    if (stakingActor) {
        return stakingActor.operatedPools.map((pool: { id: string }) => hexUtils.leftPad(pool.id));
    } else {
        return [];
    }
}

blockchainTests.fork.skip('Treasury proposal mainnet fork tests', env => {
    let staking: StakingContract;
    let stakingProxy: StakingProxyContract;
    let treasury: ZrxTreasuryContract;
    let votingPeriod: BigNumber;

    async function fastForwardToNextEpochAsync(): Promise<void> {
        const epochEndTime = await staking.getCurrentEpochEarliestEndTimeInSeconds().callAsync();
        const lastBlockTime = await env.web3Wrapper.getBlockTimestampAsync('latest');
        const dt = Math.max(0, epochEndTime.minus(lastBlockTime).toNumber());
        await env.web3Wrapper.increaseTimeAsync(dt);
        // mine next block
        await env.web3Wrapper.mineBlockAsync();
        const lastPoolId = new BigNumber(await staking.lastPoolId().callAsync(), 16);
        const batchExecuteCalldata = [
            ...[...new Array(lastPoolId.toNumber())].map((_x, i) =>
                staking.finalizePool(hexUtils.leftPad(i + 1)).getABIEncodedTransactionData(),
            ),
            staking.endEpoch().getABIEncodedTransactionData(),
            ...[...new Array(lastPoolId.toNumber())].map((_x, i) =>
                staking.finalizePool(hexUtils.leftPad(i + 1)).getABIEncodedTransactionData(),
            ),
            ...[...new Array(lastPoolId.toNumber())].map((_x, i) =>
                staking.finalizePool(hexUtils.leftPad(i + 1)).getABIEncodedTransactionData(),
            ),
        ];
        await stakingProxy.batchExecute(batchExecuteCalldata).awaitTransactionSuccessAsync();
    }

    before(async () => {
        const abis = _.mapValues({ ...artifacts, ...erc20Artifacts }, v => v.compilerOutput.abi);
        treasury = new ZrxTreasuryContract(TREASURY_ADDRESS, env.provider, env.txDefaults, abis);
        votingPeriod = await treasury.votingPeriod().callAsync();
        staking = new StakingContract(STAKING_PROXY_ADDRESS, env.provider, env.txDefaults);
        stakingProxy = new StakingProxyContract(STAKING_PROXY_ADDRESS, env.provider, env.txDefaults);
    });

    describe('Proposal 0', () => {
        it('works', async () => {
            const proposal = proposals[0];
            let executionEpoch: BigNumber;
            if (proposal.executionEpoch) {
                executionEpoch = proposal.executionEpoch;
            } else {
                const currentEpoch = await staking.currentEpoch().callAsync();
                executionEpoch = currentEpoch.plus(2);
            }
            const pools = await querySubgraphAsync(PROPOSER);
            const proposeTx = treasury.propose(proposal.actions, executionEpoch, proposal.description, pools);

            const calldata = proposeTx.getABIEncodedTransactionData();
            logUtils.log('ZrxTreasury.propose calldata:');
            logUtils.log(calldata);

            const proposalId = await proposeTx.callAsync({ from: PROPOSER });
            const receipt = await proposeTx.awaitTransactionSuccessAsync({ from: PROPOSER });
            verifyEventsFromLogs(
                receipt.logs,
                [
                    {
                        ...proposal,
                        proposalId,
                        executionEpoch,
                        proposer: PROPOSER,
                        operatedPoolIds: pools,
                    },
                ],
                ZrxTreasuryEvents.ProposalCreated,
            );
            await fastForwardToNextEpochAsync();
            await fastForwardToNextEpochAsync();
            await treasury
                .castVote(proposalId, true, VOTER_OPERATED_POOLS)
                .awaitTransactionSuccessAsync({ from: VOTER });
            await env.web3Wrapper.increaseTimeAsync(votingPeriod.plus(1).toNumber());
            await env.web3Wrapper.mineBlockAsync();
            const executeTx = await treasury.execute(proposalId, proposal.actions).awaitTransactionSuccessAsync();
            verifyEventsFromLogs(
                executeTx.logs,
                [
                    {
                        proposalId,
                    },
                ],
                ZrxTreasuryEvents.ProposalExecuted,
            );
            const recipient = '0xf9347f751a6a1467abc722ec7d80ba2698dd9d6c';
            verifyEventsFromLogs(
                executeTx.logs,
                [
                    {
                        _from: TREASURY_ADDRESS,
                        _to: recipient,
                        _value: new BigNumber(400_000).times('1e18'),
                    },
                ],
                ERC20TokenEvents.Transfer,
            );
        });
    });
});
