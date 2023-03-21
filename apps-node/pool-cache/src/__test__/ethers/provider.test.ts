import { StateOverrideJsonRpcProvider } from '../../ethers/provider';
import { DOCKER_ANVIL_URL, setupDependencies, TeardownDependenciesFn } from '../test-utils/dependencies';

jest.setTimeout(1000 * 60);

// contract GasLeft {
//     function getGasLeft() external returns (uint256) {
//         return gasleft();
//     }
// }
const gasLeftByteCode =
    '0x6080604052348015600f57600080fd5b506004361060285760003560e01c806351be4eaa14602d575b600080fd5b60336045565b60408051918252519081900360200190f35b60005a90509056fea2646970667358221220b8fc97f4ae43b2849771c773ac6e7040e00be6910c96cabe366b34c3f294d27764736f6c634300060c0033';

// $ cast keccak 'getGasLeft()' | head -c 10
const getGasLeftSelector = '0x51be4eaa';

describe('StateOverrideJsonRpcProvider', () => {
    let teardownDependenciesFn: TeardownDependenciesFn;
    beforeAll(async () => {
        teardownDependenciesFn = await setupDependencies(['anvil']);
    });

    afterAll(() => {
        if (!teardownDependenciesFn()) {
            throw new Error('Failed to tear down dependencies');
        }
    });

    test('Use eth_call state override to get gas limit', async () => {
        const provider = new StateOverrideJsonRpcProvider(DOCKER_ANVIL_URL);
        provider.setStateOverride({
            '0x5555555555555555555555555555555555555555': {
                code: gasLeftByteCode,
            },
        });
        const params = [
            {
                from: '0x0000000000000000000000000000000000000042',
                to: '0x5555555555555555555555555555555555555555',
                value: '0x0',
                data: getGasLeftSelector,
            },
            'latest',
        ];

        const data = await provider.send('eth_call', params);

        const gasLimit = BigInt(data);
        expect(gasLimit).toBeGreaterThan(29_000_000n); // Ethereum block gas limit is 30m.
    });
});
