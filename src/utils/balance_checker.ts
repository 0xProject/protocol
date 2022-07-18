import { BalanceCheckerContract } from '@0x/asset-swapper';
import { artifacts } from '@0x/asset-swapper/lib/src/artifacts';
import { BlockParamLiteral, SupportedProvider } from '@0x/dev-utils';
import { BigNumber } from '@0x/utils';

// The eth_call will run out of gas if there are too many balance calls at once
const BALANCE_CHECKER_GAS_LIMIT = 5500000;

// We use this random address on which to override the bytecode (unlikely to conflict with another address)
const RANDOM_ADDRESS = '0xffffffffffffffffffffffffffffffffffffffff';

/**
 * BalanceChecker makes it easy and efficient to look up a large number of token balances at once
 */
export class BalanceChecker {
    private readonly _balanceCheckerContract: BalanceCheckerContract;
    private readonly _balanceCheckerBytecode: string;

    constructor(provider: SupportedProvider, balanceCheckerContract?: BalanceCheckerContract) {
        this._balanceCheckerContract =
            balanceCheckerContract ||
            new BalanceCheckerContract(RANDOM_ADDRESS, provider, { gas: BALANCE_CHECKER_GAS_LIMIT });
        this._balanceCheckerBytecode = artifacts.BalanceChecker.compilerOutput.evm.deployedBytecode.object;
    }

    /**
     * Fetches the tradeable balance for a list of addresses against the specified tokens.
     * Tradeable means the minimum of the balance and allowance.
     *
     * The index of an address in `addresses` must correspond with the index of a token in `tokens`
     *
     * @param addresses - an array of addresses
     * @param tokens - an array of tokens
     * @returns - an array of BigNumbers
     */
    public async getMinOfBalancesAndAllowancesAsync(
        addresses: string[],
        tokens: string[],
        allowanceTarget: string,
    ): Promise<BigNumber[]> {
        if (addresses.length !== tokens.length) {
            throw new Error(
                `expected length of addresses and tokens must be the same, actual: ${addresses.length} and ${tokens.length}`,
            );
        }

        // HACK: this checks to see if we're using a real implementation of the balanceCheckerContract or using an override
        // We do this because ganache doesn't allow for overrides. In all other environments, we should use overrides
        const shouldUseOverrides = this._balanceCheckerContract.address.toLowerCase() === RANDOM_ADDRESS;

        const txOpts = shouldUseOverrides
            ? {
                  overrides: {
                      [RANDOM_ADDRESS]: {
                          code: this._balanceCheckerBytecode,
                      },
                  },
              }
            : {};

        return this._balanceCheckerContract
            .getMinOfBalancesOrAllowances(addresses, tokens, allowanceTarget)
            .callAsync(txOpts, BlockParamLiteral.Latest);
    }

    /**
     * Fetches the balances for a list of addresses against the specified tokens.
     *
     * The index of an address in `addresses` must correspond with the index of a token in `tokens`.
     */
    public async getTokenBalancesAsync(addresses: string[], tokens: string[]): Promise<BigNumber[]> {
        if (addresses.length !== tokens.length) {
            throw new Error(
                `expected length of addresses and tokens must be the same, actual: ${addresses.length} and ${tokens.length}`,
            );
        }

        // HACK: this checks to see if we're using a real implementation of the balanceCheckerContract or using an override
        // We do this because ganache doesn't allow for overrides. In all other environments, we should use overrides
        const shouldUseOverrides = this._balanceCheckerContract.address.toLowerCase() === RANDOM_ADDRESS;

        const txOpts = shouldUseOverrides
            ? {
                  overrides: {
                      [RANDOM_ADDRESS]: {
                          code: this._balanceCheckerBytecode,
                      },
                  },
              }
            : {};

        return this._balanceCheckerContract.balances(addresses, tokens).callAsync(txOpts, BlockParamLiteral.Latest);
    }
}
