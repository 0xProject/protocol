"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const wrappers = require("../../src/wrappers");
contracts_test_utils_1.blockchainTests('Selector collision test', env => {
    it('Function selectors do not collide', () => {
        const selectorToSignature = {};
        for (const wrapper of Object.values(wrappers)) {
            if (typeof wrapper === 'function') {
                const contract = new wrapper(contracts_test_utils_1.constants.NULL_ADDRESS, env.provider, env.txDefaults);
                contract.abi
                    .filter(abiDef => abiDef.type === 'function')
                    .map(method => {
                    const methodName = method.name;
                    const selector = contract.getSelector(methodName);
                    const signature = contract.getFunctionSignature(methodName);
                    if (selectorToSignature[selector]) {
                        contracts_test_utils_1.expect(signature, `Selectors collide: ${signature}, ${selectorToSignature[selector]}`).to.equal(selectorToSignature[selector]);
                    }
                    selectorToSignature[selector] = signature;
                });
            }
        }
    });
});
//# sourceMappingURL=selector_collision_test.js.map