"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const contract_addresses_1 = require("@0x/contract-addresses");
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const subproviders_1 = require("@0x/subproviders");
const utils_1 = require("@0x/utils");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const fetch = require("isomorphic-fetch");
const _ = require("lodash");
const prompts = require("prompts");
const wrappers = require("../src/wrappers");
const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/mzhu25/zeroex-migrations';
const ownableFeature = new wrappers.OwnableFeatureContract(contracts_test_utils_1.constants.NULL_ADDRESS, new subproviders_1.Web3ProviderEngine());
const simpleFunctionRegistryFeature = new wrappers.SimpleFunctionRegistryFeatureContract(contracts_test_utils_1.constants.NULL_ADDRESS, new subproviders_1.Web3ProviderEngine());
const DO_NOT_ROLLBACK = [
    ownableFeature.getSelector('migrate'),
    ownableFeature.getSelector('transferOwnership'),
    simpleFunctionRegistryFeature.getSelector('rollback'),
    simpleFunctionRegistryFeature.getSelector('extend'),
];
const governorEncoder = utils_1.AbiEncoder.create('(bytes[], address[], uint256[])');
const selectorToSignature = {};
for (const wrapper of Object.values(wrappers)) {
    if (typeof wrapper === 'function') {
        const contract = new wrapper(contracts_test_utils_1.constants.NULL_ADDRESS, new subproviders_1.Web3ProviderEngine());
        contract.abi
            .filter(abiDef => abiDef.type === 'function')
            .map(method => {
            const methodName = method.name;
            const selector = contract.getSelector(methodName);
            const signature = contract.getFunctionSignature(methodName);
            selectorToSignature[selector] = signature;
        });
    }
}
function querySubgraphAsync() {
    return __awaiter(this, void 0, void 0, function* () {
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
        const response = yield fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
            }),
        });
        const { data: { proxyFunctions }, } = yield response.json();
        // Sort the history in chronological order
        proxyFunctions.map((fn) => fn.fullHistory.sort((a, b) => Number.parseInt(a.timestamp, 10) - Number.parseInt(b.timestamp, 10)));
        return proxyFunctions;
    });
}
function reconstructDeployments(proxyFunctions) {
    const deploymentsByTimestamp = {};
    proxyFunctions.map(fn => {
        fn.fullHistory.map((update, i) => {
            const { updates } = (deploymentsByTimestamp[update.timestamp] = deploymentsByTimestamp[update.timestamp] || { time: timestampToUTC(update.timestamp), updates: [] });
            updates.push({
                selector: fn.id,
                signature: selectorToSignature[fn.id],
                previousImpl: i > 0 ? fn.fullHistory[i - 1].impl : contracts_test_utils_1.constants.NULL_ADDRESS,
                newImpl: update.impl,
            });
        });
    });
    return Object.keys(deploymentsByTimestamp)
        .sort()
        .map(timestamp => deploymentsByTimestamp[timestamp]);
}
function timestampToUTC(timestamp) {
    return new Date(Number.parseInt(timestamp, 10) * 1000).toUTCString();
}
var CommandLineActions;
(function (CommandLineActions) {
    CommandLineActions["History"] = "History";
    CommandLineActions["Function"] = "Function";
    CommandLineActions["Current"] = "Current";
    CommandLineActions["Rollback"] = "Rollback";
    CommandLineActions["Emergency"] = "Emergency";
    CommandLineActions["Exit"] = "Exit";
})(CommandLineActions || (CommandLineActions = {}));
function confirmRollbackAsync(rollbackTargets, proxyFunctions) {
    return __awaiter(this, void 0, void 0, function* () {
        const { confirmed } = yield prompts({
            type: 'confirm',
            name: 'confirmed',
            message: `Are these the correct rollbacks?\n${Object.entries(rollbackTargets)
                .map(([selector, target]) => `[${selector}] ${selectorToSignature[selector] || '(function signature not found)'} \n    ${proxyFunctions.find(fn => fn.id === selector).currentImpl} => ${target}`)
                .join('\n')}`,
        });
        return confirmed;
    });
}
function printRollbackCalldataAsync(rollbackTargets, zeroEx) {
    return __awaiter(this, void 0, void 0, function* () {
        const numRollbacks = Object.keys(rollbackTargets).length;
        const { numTxns } = yield prompts({
            type: 'number',
            name: 'numTxns',
            message: 'To avoid limitations on calldata size, the full rollback can be split into multiple transactions. How many transactions would you like to split it into?',
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
                new Array(rollbacks.length).fill(contracts_test_utils_1.constants.ZERO_AMOUNT),
            ]);
            if (numTxns > 1) {
                utils_1.logUtils.log(`======================== Governor Calldata #${i + 1} ========================`);
            }
            utils_1.logUtils.log(rollbackCallData);
        }
    });
}
function deploymentHistoryAsync(deployments, proxyFunctions) {
    return __awaiter(this, void 0, void 0, function* () {
        const { index } = yield prompts({
            type: 'select',
            name: 'index',
            message: 'Choose a deployment:',
            choices: deployments.map((deployment, i) => ({
                title: deployment.time,
                value: i,
            })),
        });
        const { action } = yield prompts({
            type: 'select',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                { title: 'Deployment info', value: 'info' },
                { title: 'Rollback this deployment', value: 'rollback' },
            ],
        });
        if (action === 'info') {
            utils_1.logUtils.log(deployments[index].updates.map(update => ({
                selector: update.selector,
                signature: update.signature || '(function signature not found)',
                update: `${update.previousImpl} => ${update.newImpl}`,
            })));
        }
        else {
            const zeroEx = yield getMainnetContractAsync();
            const rollbackTargets = {};
            for (const update of deployments[index].updates) {
                rollbackTargets[update.selector] = update.previousImpl;
                const rollbackLength = (yield zeroEx.getRollbackLength(update.selector).callAsync()).toNumber();
                for (let i = rollbackLength - 1; i >= 0; i--) {
                    const entry = yield zeroEx.getRollbackEntryAtIndex(update.selector, new utils_1.BigNumber(i)).callAsync();
                    if (entry === update.previousImpl) {
                        break;
                    }
                    else if (i === 0) {
                        utils_1.logUtils.log('Cannot rollback this deployment. The following update from this deployment cannot be rolled back:');
                        utils_1.logUtils.log(`\t[${update.selector}] ${update.signature || '(function signature not found)'}`);
                        utils_1.logUtils.log(`\t${update.previousImpl} => ${update.newImpl}`);
                        utils_1.logUtils.log(`Cannot find ${update.previousImpl} in the selector's rollback history. It itself may have been previously rolled back.`);
                        return;
                    }
                }
            }
            const isConfirmed = yield confirmRollbackAsync(rollbackTargets, proxyFunctions);
            if (isConfirmed) {
                yield printRollbackCalldataAsync(rollbackTargets, zeroEx);
            }
        }
    });
}
function functionHistoryAsync(proxyFunctions) {
    return __awaiter(this, void 0, void 0, function* () {
        const { fnSelector } = yield prompts({
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
            utils_1.logUtils.log(`Couldn't find deployment history for selector ${fnSelector}`);
        }
        else {
            utils_1.logUtils.log(functionEntity.fullHistory.map(update => ({
                date: timestampToUTC(update.timestamp),
                impl: update.impl,
            })));
        }
    });
}
function currentFunctionsAsync(proxyFunctions) {
    return __awaiter(this, void 0, void 0, function* () {
        const currentFunctions = {};
        proxyFunctions
            .filter(fn => fn.currentImpl !== contracts_test_utils_1.constants.NULL_ADDRESS)
            .map(fn => {
            currentFunctions[fn.id] = {
                signature: selectorToSignature[fn.id] || '(function signature not found)',
                impl: fn.currentImpl,
                lastUpdated: timestampToUTC(fn.fullHistory.slice(-1)[0].timestamp),
            };
        });
        utils_1.logUtils.log(currentFunctions);
    });
}
function generateRollbackAsync(proxyFunctions) {
    return __awaiter(this, void 0, void 0, function* () {
        const zeroEx = yield getMainnetContractAsync();
        const { selected } = yield prompts({
            type: 'autocompleteMultiselect',
            name: 'selected',
            message: 'Select the functions to rollback:',
            choices: _.flatMap(proxyFunctions.filter(fn => fn.currentImpl !== contracts_test_utils_1.constants.NULL_ADDRESS), fn => [
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
        const rollbackTargets = {};
        for (const selector of selected) {
            const rollbackLength = (yield zeroEx.getRollbackLength(selector).callAsync()).toNumber();
            const rollbackHistory = yield Promise.all(_.range(rollbackLength).map((i) => __awaiter(this, void 0, void 0, function* () { return zeroEx.getRollbackEntryAtIndex(selector, new utils_1.BigNumber(i)).callAsync(); })));
            const fullHistory = proxyFunctions.find(fn => fn.id === selector).fullHistory;
            const previousImpl = rollbackHistory[rollbackLength - 1];
            const { target } = yield prompts({
                type: 'select',
                name: 'target',
                message: 'Select the implementation to rollback to',
                hint: `[${selector}] ${selectorToSignature[selector] || '(function signature not found)'}`,
                choices: [
                    {
                        title: 'DISABLE',
                        value: contracts_test_utils_1.constants.NULL_ADDRESS,
                        description: 'Rolls back to address(0)',
                    },
                    ...(previousImpl !== contracts_test_utils_1.constants.NULL_ADDRESS
                        ? [
                            {
                                title: 'PREVIOUS',
                                value: previousImpl,
                                description: `${previousImpl} (${timestampToUTC(_.findLast(fullHistory, update => update.impl === previousImpl).timestamp)})`,
                            },
                        ]
                        : []),
                    ...[...new Set(rollbackHistory)]
                        .filter(impl => impl !== contracts_test_utils_1.constants.NULL_ADDRESS)
                        .map(impl => ({
                        title: impl,
                        value: impl,
                        description: timestampToUTC(_.findLast(fullHistory, update => update.impl === impl).timestamp),
                    })),
                ],
            });
            rollbackTargets[selector] = target;
        }
        const isConfirmed = yield confirmRollbackAsync(rollbackTargets, proxyFunctions);
        if (isConfirmed) {
            yield printRollbackCalldataAsync(rollbackTargets, zeroEx);
        }
    });
}
function generateEmergencyRollbackAsync(proxyFunctions) {
    return __awaiter(this, void 0, void 0, function* () {
        const zeroEx = new wrappers.IZeroExContract(contract_addresses_1.getContractAddressesForChainOrThrow(1).exchangeProxy, new subproviders_1.Web3ProviderEngine());
        const allSelectors = proxyFunctions
            .filter(fn => fn.currentImpl !== contracts_test_utils_1.constants.NULL_ADDRESS && !DO_NOT_ROLLBACK.includes(fn.id))
            .map(fn => fn.id);
        yield printRollbackCalldataAsync(_.zipObject(allSelectors, new Array(allSelectors.length).fill(contracts_test_utils_1.constants.NULL_ADDRESS)), zeroEx);
    });
}
let provider = process.env.RPC_URL ? createWeb3Provider(process.env.RPC_URL) : undefined;
function createWeb3Provider(rpcUrl) {
    const providerEngine = new subproviders_1.Web3ProviderEngine();
    providerEngine.addProvider(new subproviders_1.RPCSubprovider(rpcUrl));
    utils_1.providerUtils.startProviderEngine(providerEngine);
    return providerEngine;
}
function getMainnetContractAsync() {
    return __awaiter(this, void 0, void 0, function* () {
        if (provider === undefined) {
            const { rpcUrl } = yield prompts({
                type: 'text',
                name: 'rpcUrl',
                message: 'Enter an RPC endpoint:',
            });
            provider = createWeb3Provider(rpcUrl);
        }
        const chainId = yield new web3_wrapper_1.Web3Wrapper(provider).getChainIdAsync();
        const { exchangeProxy } = contract_addresses_1.getContractAddressesForChainOrThrow(chainId);
        return new wrappers.IZeroExContract(exchangeProxy, provider);
    });
}
(() => __awaiter(this, void 0, void 0, function* () {
    const proxyFunctions = yield querySubgraphAsync();
    const deployments = reconstructDeployments(proxyFunctions);
    while (true) {
        const { action } = yield prompts({
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
                yield deploymentHistoryAsync(deployments, proxyFunctions);
                break;
            case CommandLineActions.Function:
                yield functionHistoryAsync(proxyFunctions);
                break;
            case CommandLineActions.Current:
                yield currentFunctionsAsync(proxyFunctions);
                break;
            case CommandLineActions.Rollback:
                yield generateRollbackAsync(proxyFunctions);
                break;
            case CommandLineActions.Emergency:
                yield generateEmergencyRollbackAsync(proxyFunctions);
                break;
            case CommandLineActions.Exit:
            default:
                process.exit(0);
        }
    }
}))().catch(err => {
    utils_1.logUtils.log(err);
    process.exit(1);
});
//# sourceMappingURL=rollback.js.map