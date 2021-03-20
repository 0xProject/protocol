import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { ERC20TokenContract } from '@0x/contracts-erc20';
import { StakingContract } from '@0x/contracts-staking';
import { RPCSubprovider, SupportedProvider, Web3ProviderEngine } from '@0x/subproviders';
import { BigNumber, hexUtils, logUtils, providerUtils } from '@0x/utils';
import * as _ from 'lodash';

import { ZrxTreasuryContract } from './wrappers';

const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/mzhu25/zeroex-staking';

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
        return stakingActor.operatedPools.map((pool: { id: string }) => hexUtils.leftPad(new BigNumber(pool.id, 16)));
    } else {
        return [];
    }
}

function createWeb3Provider(rpcUrl: string): SupportedProvider {
    const providerEngine = new Web3ProviderEngine();
    providerEngine.addProvider(new RPCSubprovider(rpcUrl));
    providerUtils.startProviderEngine(providerEngine);
    return providerEngine;
}

interface ProposedAction {
    target: string;
    data: string;
    value: BigNumber;
}

async function generateProposalCalldataAsync(
    provider: SupportedProvider,
    actions: ProposedAction[],
    description: string,
    proposer: string,
    executionEpoch?: number | BigNumber,
): Promise<void> {
    const pools = await querySubgraphAsync(proposer);
    const { stakingProxy, zrxTreasury } = getContractAddressesForChainOrThrow(1);
    const treasury = new ZrxTreasuryContract(zrxTreasury, provider);
    const votingPower = await treasury.getVotingPower(proposer, pools).callAsync();
    const proposalThreshold = await treasury.proposalThreshold().callAsync();
    if (votingPower.isLessThan(proposalThreshold)) {
        logUtils.warn(
            `Insufficient voting power: ${proposer} has ${votingPower} voting power but the proposal threshold is ${proposalThreshold}`,
        );
    }
    const currentEpoch = await new StakingContract(stakingProxy, provider).currentEpoch().callAsync();
    executionEpoch = new BigNumber(executionEpoch || currentEpoch.plus(2));
    if (executionEpoch.isLessThan(currentEpoch.plus(2))) {
        logUtils.log(
            `Invalid execution epoch. ${executionEpoch} was given; the minimum execution epoch is ${currentEpoch.plus(
                2,
            )} (the current epoch + 2)`,
        );
        return;
    }
    const proposalCalldata = treasury
        .propose(actions, executionEpoch, description, pools)
        .getABIEncodedTransactionData();
    logUtils.log('ZrxTreasury.propose calldata:');
    logUtils.log(proposalCalldata);
}

(async () => {
    if (!process.env.RPC_URL) {
        logUtils.log('No RPC endpoint provided');
        return;
    }
    const provider = createWeb3Provider(process.env.RPC_URL);
    const { zrxToken } = getContractAddressesForChainOrThrow(1);
    const zrx = new ERC20TokenContract(zrxToken, provider);
    const exampleAction = {
        target: zrxToken,
        data: zrx
            .transfer('0xdecafc0ffee00000000000000000000000000000', new BigNumber('1e18'))
            .getABIEncodedTransactionData(),
        value: new BigNumber(0),
    };
    await generateProposalCalldataAsync(
        provider,
        [exampleAction],
        '# A compelling description\n## Ideally in Markdown\nBecause the website should be able to parse this',
        '0x0000000000000000000000000000000000000000',
    );
})().catch(err => {
    logUtils.log(err);
    process.exit(1);
});
