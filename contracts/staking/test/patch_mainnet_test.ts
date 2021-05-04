import { blockchainTests, constants, expect, filterLogsToArguments } from '@0x/contracts-test-utils';
import { BigNumber, logUtils } from '@0x/utils';
import * as _ from 'lodash';

import { artifacts } from './artifacts';
import { StakingEvents, StakingPatchContract, StakingProxyContract, StakingProxyEvents } from './wrappers';

const abis = _.mapValues(artifacts, v => v.compilerOutput.abi);
const STAKING_PROXY = '0xa26e80e7dea86279c6d778d702cc413e6cffa777';
const STAKING_OWNER = '0x7d3455421bbc5ed534a83c88fd80387dc8271392';
const EXCHANGE_PROXY = '0xdef1c0ded9bec7f1a1670819833240f027b25eff';
blockchainTests.configure({
    fork: {
        unlockedAccounts: [STAKING_OWNER, EXCHANGE_PROXY],
    },
});

blockchainTests.fork('Staking patch mainnet fork tests', env => {
    let stakingProxyContract: StakingProxyContract;
    let patchedStakingPatchContract: StakingPatchContract;

    before(async () => {
        stakingProxyContract = new StakingProxyContract(STAKING_PROXY, env.provider, undefined, abis);
        patchedStakingPatchContract = await StakingPatchContract.deployFrom0xArtifactAsync(
            artifacts.Staking,
            env.provider,
            env.txDefaults,
            artifacts,
        );
    });

    it('Staking proxy successfully attaches to patched logic', async () => {
        const tx = await stakingProxyContract
            .attachStakingContract(patchedStakingPatchContract.address)
            .awaitTransactionSuccessAsync({ from: STAKING_OWNER, gasPrice: 0 }, { shouldValidate: false });
        expect(filterLogsToArguments(tx.logs, StakingProxyEvents.StakingContractAttachedToProxy)).to.deep.equal([
            {
                newStakingPatchContractAddress: patchedStakingPatchContract.address,
            },
        ]);
        expect(filterLogsToArguments(tx.logs, StakingEvents.EpochEnded).length).to.equal(1);
        expect(filterLogsToArguments(tx.logs, StakingEvents.EpochFinalized).length).to.equal(1);
        logUtils.log(`${tx.gasUsed} gas used`);
    });

    it('Patched staking handles 0 gas protocol fees', async () => {
        const staking = new StakingPatchContract(STAKING_PROXY, env.provider, undefined, abis);
        const maker = '0x7b1886e49ab5433bb46f7258548092dc8cdca28b';
        const zeroFeeTx = await staking
            .payProtocolFee(maker, constants.NULL_ADDRESS, constants.ZERO_AMOUNT)
            .awaitTransactionSuccessAsync({ from: EXCHANGE_PROXY, gasPrice: 0 }, { shouldValidate: false });
        // StakingPoolEarnedRewardsInEpoch should _not_ be emitted for a zero protocol fee.
        // tslint:disable-next-line:no-unused-expression
        expect(filterLogsToArguments(zeroFeeTx.logs, StakingEvents.StakingPoolEarnedRewardsInEpoch)).to.be.empty;

        // Coincidentally there's some ETH in the ExchangeProxy
        const nonZeroFeeTx = await staking
            .payProtocolFee(maker, constants.NULL_ADDRESS, new BigNumber(1))
            .awaitTransactionSuccessAsync({ from: EXCHANGE_PROXY, gasPrice: 0, value: 1 }, { shouldValidate: false });
        // StakingPoolEarnedRewardsInEpoch _should_ be emitted for a non-zero protocol fee.
        expect(
            filterLogsToArguments(nonZeroFeeTx.logs, StakingEvents.StakingPoolEarnedRewardsInEpoch),
        ).to.have.lengthOf(1);
    });
});
// tslint:enable:no-unnecessary-type-assertion
