import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { constants } from '@0x/contracts-test-utils';
import { RPCSubprovider, Web3ProviderEngine } from '@0x/subproviders';
import { AbiEncoder, BigNumber, logUtils, providerUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { MethodAbi, SupportedProvider } from 'ethereum-types';
import * as fetch from 'isomorphic-fetch';
import * as _ from 'lodash';
import * as prompts from 'prompts';

import * as wrappers from '../src/wrappers';

const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/0xeng/zeroex-features-mainnet';

const ownableFeature = new wrappers.OwnableFeatureContract(constants.NULL_ADDRESS, new Web3ProviderEngine());
const simpleFunctionRegistryFeature = new wrappers.SimpleFunctionRegistryFeatureContract(
    constants.NULL_ADDRESS,
    new Web3ProviderEngine(),
);
const DO_NOT_ROLLBACK = [
    ownableFeature.getSelector('owner'),
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

async function confirmRollbackAsync(
    rollbackTargets: { [selector: string]: string },
    proxyFunctions: ProxyFunctionEntity[],
): Promise<boolean> {
    const { confirmed } = await prompts({
        type: 'confirm',
        name: 'confirmed',
        message: `Are these the correct rollbacks?\n${Object.entries(rollbackTargets)
            .map(
                ([selector, target]) =>
                    `[${selector}] ${selectorToSignature[selector] || '(function signature not found)'} \n    ${
                        proxyFunctions.find(fn => fn.id === selector)!.currentImpl
                    } => ${target}`,
            )
            .join('\n')}`,
    });
    return confirmed;
}

async function printRollbackCalldataAsync(
    rollbackTargets: { [selector: string]: string },
    zeroEx: wrappers.IZeroExContract,
): Promise<void> {
    const numRollbacks = Object.keys(rollbackTargets).length;
    const { numTxns } = await prompts({
        type: 'number',
        name: 'numTxns',
        message:
            'To avoid limitations on calldata size, the full rollback can be split into multiple transactions. How many transactions would you like to split it into?',
        initial: 1,
        style: 'default',
        min: 1,
        max: numRollbacks,
    });
    for (let i = 0; i < numTxns; i++) {
        const startIndex = i * Math.trunc(numRollbacks / numTxns);
        const endIndex = startIndex + Math.trunc(numRollbacks / numTxns) + (i < numRollbacks % numTxns ? 1 : 0);
        const rollbacks = Object.entries(rollbackTargets).slice(startIndex, endIndex);
        const rollbackCallData = governorEncoder.encode([
            rollbacks.map(([selector, target]) => zeroEx.rollback(selector, target).getABIEncodedTransactionData()),
            new Array(rollbacks.length).fill(zeroEx.address),
            new Array(rollbacks.length).fill(constants.ZERO_AMOUNT),
        ]);
        if (numTxns > 1) {
            logUtils.log(`======================== Governor Calldata #${i + 1} ========================`);
        }
        logUtils.log(rollbackCallData);
    }
}

async function deploymentHistoryAsync(deployments: Deployment[], proxyFunctions: ProxyFunctionEntity[]): Promise<void> {
    const { index } = await prompts({
        type: 'select',
        name: 'index',
        message: 'Choose a deployment:',
        choices: deployments.map((deployment, i) => ({
            title: deployment.time,
            value: i,
        })),
    });

    const { action } = await prompts({
        type: 'select',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
            { title: 'Deployment info', value: 'info' },
            { title: 'Rollback this deployment', value: 'rollback' },
        ],
    });

    if (action === 'info') {
        logUtils.log(
            deployments[index].updates.map(update => ({
                selector: update.selector,
                signature: update.signature || '(function signature not found)',
                update: `${update.previousImpl} => ${update.newImpl}`,
            })),
        );
    } else {
        const zeroEx = await getMainnetContractAsync();
        const rollbackTargets: { [selector: string]: string } = {};
        for (const update of deployments[index].updates) {
            rollbackTargets[update.selector] = update.previousImpl;
            const rollbackLength = (await zeroEx.getRollbackLength(update.selector).callAsync()).toNumber();
            for (let i = rollbackLength - 1; i >= 0; i--) {
                const entry = await zeroEx.getRollbackEntryAtIndex(update.selector, new BigNumber(i)).callAsync();
                if (entry === update.previousImpl) {
                    break;
                } else if (i === 0) {
                    logUtils.log(
                        'Cannot rollback this deployment. The following update from this deployment cannot be rolled back:',
                    );
                    logUtils.log(`\t[${update.selector}] ${update.signature || '(function signature not found)'}`);
                    logUtils.log(`\t${update.previousImpl} => ${update.newImpl}`);
                    logUtils.log(
                        `Cannot find ${update.previousImpl} in the selector's rollback history. It itself may have been previously rolled back.`,
                    );
                    return;
                }
            }
        }
        const isConfirmed = await confirmRollbackAsync(rollbackTargets, proxyFunctions);
        if (isConfirmed) {
            await printRollbackCalldataAsync(rollbackTargets, zeroEx);
        }
    }
}

async function functionHistoryAsync(proxyFunctions: ProxyFunctionEntity[]): Promise<void> {
    const { fnSelector } = await prompts({
        type: 'autocomplete',
        name: 'fnSelector',
        message: 'Enter the selector or name of the function:',
        choices: [
            ...proxyFunctions.map(fn => ({
                title: fn.id,
                value: fn.id,
                description: selectorToSignature[fn.id] || '(function signature not found)',
            })),
            ...proxyFunctions.map(fn => ({
                title: selectorToSignature[fn.id] || '(function signature not found)',
                value: fn.id,
                description: fn.id,
            })),
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

async function generateRollbackAsync(proxyFunctions: ProxyFunctionEntity[]): Promise<void> {
    const zeroEx = await getMainnetContractAsync();
    const { selected } = await prompts({
        type: 'autocompleteMultiselect',
        name: 'selected',
        message: 'Select the functions to rollback:',
        choices: _.flatMap(
            proxyFunctions.filter(fn => fn.currentImpl !== constants.NULL_ADDRESS),
            fn => [
                {
                    title: [
                        `[${fn.id}]`,
                        `Implemented @ ${fn.currentImpl}`,
                        selectorToSignature[fn.id] || '(function signature not found)',
                    ].join('\n\t\t\t\t'),
                    value: fn.id,
                },
            ],
        ),
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
                ...(previousImpl !== constants.NULL_ADDRESS
                    ? [
                          {
                              title: 'PREVIOUS',
                              value: previousImpl,
                              description: `${previousImpl} (${timestampToUTC(
                                  _.findLast(fullHistory, update => update.impl === previousImpl)!.timestamp,
                              )})`,
                          },
                      ]
                    : []),
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

    const isConfirmed = await confirmRollbackAsync(rollbackTargets, proxyFunctions);
    if (isConfirmed) {
        await printRollbackCalldataAsync(rollbackTargets, zeroEx);
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
    await printRollbackCalldataAsync(
        _.zipObject(allSelectors, new Array(allSelectors.length).fill(constants.NULL_ADDRESS)),
        zeroEx,
    );
}

let provider: SupportedProvider | undefined = process.env.RPC_URL ? createWeb3Provider(process.env.RPC_URL) : undefined;

function createWeb3Provider(rpcUrl: string): SupportedProvider {
    const providerEngine = new Web3ProviderEngine();
    providerEngine.addProvider(new RPCSubprovider(rpcUrl));
    providerUtils.startProviderEngine(providerEngine);
    return providerEngine;
}

async function getMainnetContractAsync(): Promise<wrappers.IZeroExContract> {
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
    return new wrappers.IZeroExContract(exchangeProxy, provider);
}

(async () => {
    const proxyFunctions = await querySubgraphAsync();
    const deployments = reconstructDeployments(proxyFunctions);

    for (;;) {
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
                await deploymentHistoryAsync(deployments, proxyFunctions);
                break;
            case CommandLineActions.Function:
                await functionHistoryAsync(proxyFunctions);
                break;
            case CommandLineActions.Current:
                await currentFunctionsAsync(proxyFunctions);
                break;
            case CommandLineActions.Rollback:
                await generateRollbackAsync(proxyFunctions);
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
