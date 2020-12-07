import { blockchainTests, constants, expect } from '@0x/contracts-test-utils';
import { MethodAbi } from 'ethereum-types';

import * as wrappers from '../../src/wrappers';

blockchainTests('Selector collision test', env => {
    it('Function selectors do not collide', () => {
        const selectorToSignature: { [selector: string]: string } = {};
        for (const wrapper of Object.values(wrappers)) {
            if (typeof wrapper === 'function') {
                const contract = new wrapper(constants.NULL_ADDRESS, env.provider, env.txDefaults);
                contract.abi
                    .filter(abiDef => abiDef.type === 'function')
                    .map(method => {
                        const methodName = (method as MethodAbi).name;
                        const selector = contract.getSelector(methodName);
                        const signature = contract.getFunctionSignature(methodName);
                        if (selectorToSignature[selector]) {
                            expect(
                                signature,
                                `Selectors collide: ${signature}, ${selectorToSignature[selector]}`,
                            ).to.equal(selectorToSignature[selector]);
                        }
                        selectorToSignature[selector] = signature;
                    });
            }
        }
    });
});
