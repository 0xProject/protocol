import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { constants } from '@0x/contracts-test-utils';
import { RPCSubprovider, SupportedProvider, Web3ProviderEngine } from '@0x/subproviders';
import { AbiEncoder, BigNumber, logUtils, providerUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { MethodAbi } from 'ethereum-types';
import * as fetch from 'isomorphic-fetch';
import * as _ from 'lodash';
import * as prompts from 'prompts';

import * as wrappers from '../src/wrappers';

const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/mzhu25/zeroex-migrations';

const ownableFeature = new wrappers.OwnableFeatureContract(constants.NULL_ADDRESS, new Web3ProviderEngine());
const simpleFunctionRegistryFeature = new wrappers.SimpleFunctionRegistryFeatureContract(
    constants.NULL_ADDRESS,
    new Web3ProviderEngine(),
);
const DO_NOT_ROLLBACK = [
    ownableFeature.getSelector('migrate'),
    ownableFeature.getSelector('transferOwnership'),
    simpleFunctionRegistryFeature.getSelector('rollback'),
    simpleFunctionRegistryFeature.getSelector('extend'),
];

const governorEncoder = AbiEncoder.create('(bytes[], address[], uint256[])');

const selectorToSignature: { [selector: string]: string } = {};
for (const wrapper of Object.values(wrappers)) {
    if (typeof wrapper === 'function') {
        const contract = new wrapper(constants.NULL_ADDRESS, new Web3ProviderEngine());
        contract.abi
            .filter(abiDef => abiDef.type === 'function')
            .map(method => {
                const methodName = (method as MethodAbi).name;
                const selector = contract.getSelector(methodName);
                const signature = contract.getFunctionSignature(methodName);
                selectorToSignature[selector] = signature;
            });
    }
}

interface ProxyFunctionEntity {
    id: string;
    currentImpl: string;
    fullHistory: Array<{ impl: string; timestamp: string }>;
}

interface Deployment {
    time: string;
    updates: Array<{ selector: string; signature?: string; previousImpl: string; newImpl: string }>;
}

async function querySubgraphAsync(): Promise<ProxyFunctionEntity[]> {
    const query = `
        {
            proxyFunctions {
                id
                currentImpl
                fullHistory {
                    impl
                    timestamp
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
        data: { proxyFunctions },
    } = await response.json();
    // Sort the history in chronological order
    proxyFunctions.map((fn: ProxyFunctionEntity) =>
        fn.fullHistory.sort((a, b) => Number.parseInt(a.timestamp, 10) - Number.parseInt(b.timestamp, 10)),
    );
    return proxyFunctions;
}

function reconstructDeployments(proxyFunctions: ProxyFunctionEntity[]): Deployment[] {
    const deploymentsByTimestamp: { [timestamp: string]: Deployment } = {};
    proxyFunctions.map(fn => {
        fn.fullHistory.map((update, i) => {
            const { updates } = (deploymentsByTimestamp[update.timestamp] = deploymentsByTimestamp[
                update.timestamp
            ] || { time: timestampToUTC(update.timestamp), updates: [] });
            updates.push({
                selector: fn.id,
                signature: selectorToSignature[fn.id],
                previousImpl: i > 0 ? fn.fullHistory[i - 1].impl : constants.NULL_ADDRESS,
                newImpl: update.impl,
            });
        });
    });
    return Object.keys(deploymentsByTimestamp)
        .sort()
        .map(timestamp => deploymentsByTimestamp[timestamp]);
}

function createWeb3Provider(rpcUrl: string): SupportedProvider {
    const providerEngine = new Web3ProviderEngine();
    providerEngine.addProvider(new RPCSubprovider(rpcUrl));
    providerUtils.startProviderEngine(providerEngine);
    return providerEngine;
}

function timestampToUTC(timestamp: string): string {
    return new Date(Number.parseInt(timestamp, 10) * 1000).toUTCString();
}

enum CommandLineActions {
    History = 'History',
    Function = 'Function',
    Current = 'Current',
    Rollback = 'Rollback',
    Emergency = 'Emergency',
    Exit = 'Exit',
}

async function deploymentHistoryAsync(deployments: Deployment[]): Promise<void> {
    const { index } = await prompts({
        type: 'select',
        name: 'index',
        message: 'What would you like to do?',
        choices: deployments.map((deployment, i) => ({
            title: deployment.time,
            value: i,
        })),
    });
    logUtils.log(
        deployments[index].updates.map(update => ({
            selector: update.selector,
            signature: update.signature || '(function signature not found)',
            update: `${update.previousImpl} => ${update.newImpl}`,
        })),
    );
}

async function functionHistoryAsync(proxyFunctions: ProxyFunctionEntity[]): Promise<void> {
    const { fnSelector } = await prompts({
        type: 'autocomplete',
        name: 'fnSelector',
        message: 'Enter the selector or name of the function:',
        choices: [
            ..._.flatMap(Object.entries(selectorToSignature), ([selector, signature]) => [
                { title: selector, value: selector, description: signature },
                { title: signature, value: selector, description: selector },
            ]),
            ...proxyFunctions
                .filter(fn => !Object.keys(selectorToSignature).includes(fn.id))
                .map(fn => ({ title: fn.id, value: fn.id, description: '(function signature not found)' })),
        ],
    });
    const functionEntity = proxyFunctions.find(fn => fn.id === fnSelector);
    if (functionEntity === undefined) {
        logUtils.log(`Couldn't find deployment history for selector ${fnSelector}`);
    } else {
        logUtils.log(
            functionEntity.fullHistory.map(update => ({
                date: timestampToUTC(update.timestamp),
                impl: update.impl,
            })),
        );
    }
}

async function currentFunctionsAsync(proxyFunctions: ProxyFunctionEntity[]): Promise<void> {
    const currentFunctions: {
        [selector: string]: { signature: string; impl: string; lastUpdated: string };
    } = {};
    proxyFunctions
        .filter(fn => fn.currentImpl !== constants.NULL_ADDRESS)
        .map(fn => {
            currentFunctions[fn.id] = {
                signature: selectorToSignature[fn.id] || '(function signature not found)',
                impl: fn.currentImpl,
                lastUpdated: timestampToUTC(fn.fullHistory.slice(-1)[0].timestamp),
            };
        });
    logUtils.log(currentFunctions);
}

async function generateRollbackAsync(
    proxyFunctions: ProxyFunctionEntity[],
    zeroEx: wrappers.IZeroExContract,
): Promise<void> {
    const { selected } = await prompts({
        type: 'autocompleteMultiselect',
        name: 'selected',
        message: 'Select the functions to rollback:',
        choices: _.flatMap(proxyFunctions.filter(fn => fn.currentImpl !== constants.NULL_ADDRESS), fn => [
            {
                title: [
                    `[${fn.id}]`,
                    `Implemented @ ${fn.currentImpl}`,
                    selectorToSignature[fn.id] || '(function signature not found)',
                ].join('\n\t\t\t\t'),
                value: fn.id,
            },
        ]),
    });
    const rollbackTargets: { [selector: string]: string } = {};
    for (const selector of selected) {
        const rollbackLength = (await zeroEx.getRollbackLength(selector).callAsync()).toNumber();
        const rollbackHistory = await Promise.all(
            _.range(rollbackLength).map(async i =>
                zeroEx.getRollbackEntryAtIndex(selector, new BigNumber(i)).callAsync(),
            ),
        );
        const fullHistory = proxyFunctions.find(fn => fn.id === selector)!.fullHistory;
        const previousImpl = rollbackHistory[rollbackLength - 1];
        const { target } = await prompts({
            type: 'select',
            name: 'target',
            message: 'Select the implementation to rollback to',
            hint: `[${selector}] ${selectorToSignature[selector] || '(function signature not found)'}`,
            choices: [
                {
                    title: 'DISABLE',
                    value: constants.NULL_ADDRESS,
                    description: 'Rolls back to address(0)',
                },
                {
                    title: 'PREVIOUS',
                    value: previousImpl,
                    description: `${previousImpl} (${timestampToUTC(
                        _.findLast(fullHistory, update => update.impl === previousImpl)!.timestamp,
                    )})`,
                },
                ...[...new Set(rollbackHistory)]
                    .filter(impl => impl !== constants.NULL_ADDRESS)
                    .map(impl => ({
                        title: impl,
                        value: impl,
                        description: timestampToUTC(_.findLast(fullHistory, update => update.impl === impl)!.timestamp),
                    })),
            ],
        });
        rollbackTargets[selector] = target;
    }

    const { confirmed } = await prompts({
        type: 'confirm',
        name: 'confirmed',
        message: `Are these the correct rollbacks?\n${selected
            .map(
                (selector: string) =>
                    `[${selector}] ${selectorToSignature[selector] || '(function signature not found)'} \n    ${
                        proxyFunctions.find(fn => fn.id === selector)!.currentImpl
                    } => ${rollbackTargets[selector]}`,
            )
            .join('\n')}`,
    });
    if (confirmed) {
        const rollbackCallData = governorEncoder.encode([
            selected.map((selector: string) =>
                zeroEx.rollback(selector, rollbackTargets[selector]).getABIEncodedTransactionData(),
            ),
            new Array(selected.length).fill(zeroEx.address),
            new Array(selected.length).fill(constants.ZERO_AMOUNT),
        ]);
        logUtils.log(rollbackCallData);
    }
}

async function generateEmergencyRollbackAsync(proxyFunctions: ProxyFunctionEntity[]): Promise<void> {
    const zeroEx = new wrappers.IZeroExContract(
        getContractAddressesForChainOrThrow(1).exchangeProxy,
        new Web3ProviderEngine(),
    );
    const allSelectors = proxyFunctions
        .filter(fn => fn.currentImpl !== constants.NULL_ADDRESS && !DO_NOT_ROLLBACK.includes(fn.id))
        .map(fn => fn.id);
    const emergencyCallData = governorEncoder.encode([
        allSelectors.map((selector: string) =>
            zeroEx.rollback(selector, constants.NULL_ADDRESS).getABIEncodedTransactionData(),
        ),
        new Array(allSelectors.length).fill(zeroEx.address),
        new Array(allSelectors.length).fill(constants.ZERO_AMOUNT),
    ]);
    logUtils.log(emergencyCallData);
}

(async () => {
    let provider: SupportedProvider | undefined = process.env.RPC_URL
        ? createWeb3Provider(process.env.RPC_URL)
        : undefined;
    const proxyFunctions = await querySubgraphAsync();
    const deployments = reconstructDeployments(proxyFunctions);

    while (true) {
        const { action } = await prompts({
            type: 'select',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                { title: '🚢 Deployment history', value: CommandLineActions.History },
                { title: '📜 Function history', value: CommandLineActions.Function },
                { title: '🗺️  Currently registered functions', value: CommandLineActions.Current },
                { title: '🔙 Generate rollback calldata', value: CommandLineActions.Rollback },
                { title: '🚨 Emergency shutdown calldata', value: CommandLineActions.Emergency },
                { title: '👋 Exit', value: CommandLineActions.Exit },
            ],
        });

        switch (action) {
            case CommandLineActions.History:
                await deploymentHistoryAsync(deployments);
                break;
            case CommandLineActions.Function:
                await functionHistoryAsync(proxyFunctions);
                break;
            case CommandLineActions.Current:
                await currentFunctionsAsync(proxyFunctions);
                break;
            case CommandLineActions.Rollback:
                if (provider === undefined) {
                    const { rpcUrl } = await prompts({
                        type: 'text',
                        name: 'rpcUrl',
                        message: 'Enter an RPC endpoint:',
                    });
                    provider = createWeb3Provider(rpcUrl);
                }
                const chainId = await new Web3Wrapper(provider).getChainIdAsync();
                const { exchangeProxy } = getContractAddressesForChainOrThrow(chainId);
                const zeroEx = new wrappers.IZeroExContract(exchangeProxy, provider);
                await generateRollbackAsync(proxyFunctions, zeroEx);
                break;
            case CommandLineActions.Emergency:
                await generateEmergencyRollbackAsync(proxyFunctions);
                break;
            case CommandLineActions.Exit:
            default:
                process.exit(0);
        }
    }
})().catch(err => {
    logUtils.log(err);
    process.exit(1);
});
