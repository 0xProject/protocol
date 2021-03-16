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
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const utils_1 = require("@0x/utils");
const artifacts_1 = require("./artifacts");
const wrappers_1 = require("./wrappers");
contracts_test_utils_1.blockchainTests.resets('ProtocolFees', env => {
    const FEE_MULTIPLIER = 70e3;
    let taker;
    let unauthorized;
    let protocolFees;
    let staking;
    let weth;
    let feeCollectorController;
    let singleFeeAmount;
    before(() => __awaiter(this, void 0, void 0, function* () {
        [taker, unauthorized] = yield env.getAccountAddressesAsync();
        weth = yield wrappers_1.TestWethContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestWeth, env.provider, env.txDefaults, artifacts_1.artifacts);
        staking = yield wrappers_1.TestStakingContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestStaking, env.provider, env.txDefaults, artifacts_1.artifacts, weth.address);
        feeCollectorController = yield wrappers_1.FeeCollectorControllerContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.FeeCollectorController, env.provider, env.txDefaults, artifacts_1.artifacts, weth.address, staking.address);
        protocolFees = yield wrappers_1.TestFixinProtocolFeesContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestFixinProtocolFees, env.provider, Object.assign({}, env.txDefaults, { from: taker }), artifacts_1.artifacts, weth.address, staking.address, feeCollectorController.address, FEE_MULTIPLIER);
        singleFeeAmount = yield protocolFees.getSingleProtocolFee().callAsync();
        yield weth.mint(taker, singleFeeAmount).awaitTransactionSuccessAsync();
        yield weth.approve(protocolFees.address, singleFeeAmount).awaitTransactionSuccessAsync({ from: taker });
    }));
    describe('FeeCollector', () => {
        it('should disallow unauthorized initialization', () => __awaiter(this, void 0, void 0, function* () {
            const pool = utils_1.hexUtils.random();
            yield protocolFees.collectProtocolFee(pool).awaitTransactionSuccessAsync({ value: singleFeeAmount });
            yield protocolFees.transferFeesForPool(pool).awaitTransactionSuccessAsync();
            const feeCollector = new wrappers_1.FeeCollectorContract(yield protocolFees.getFeeCollector(pool).callAsync(), env.provider, env.txDefaults);
            const tx = feeCollector
                .initialize(weth.address, staking.address, pool)
                .sendTransactionAsync({ from: unauthorized });
            return contracts_test_utils_1.expect(tx).to.revertWith(new utils_1.AuthorizableRevertErrors.SenderNotAuthorizedError(unauthorized));
        }));
    });
    describe('_collectProtocolFee()', () => {
        const pool1 = utils_1.hexUtils.random();
        const pool2 = utils_1.hexUtils.random();
        let feeCollector1Address;
        let feeCollector2Address;
        before(() => __awaiter(this, void 0, void 0, function* () {
            feeCollector1Address = yield protocolFees.getFeeCollector(pool1).callAsync();
            feeCollector2Address = yield protocolFees.getFeeCollector(pool2).callAsync();
        }));
        it('should revert if insufficient ETH transferred', () => __awaiter(this, void 0, void 0, function* () {
            const tooLittle = singleFeeAmount.minus(1);
            const tx = protocolFees.collectProtocolFee(pool1).awaitTransactionSuccessAsync({ value: tooLittle });
            return contracts_test_utils_1.expect(tx).to.revertWith('FixinProtocolFees/ETHER_TRANSFER_FALIED');
        }));
        it('should accept ETH fee', () => __awaiter(this, void 0, void 0, function* () {
            const beforeETH = yield env.web3Wrapper.getBalanceInWeiAsync(taker);
            yield protocolFees.collectProtocolFee(pool1).awaitTransactionSuccessAsync({ value: singleFeeAmount });
            const afterETH = yield env.web3Wrapper.getBalanceInWeiAsync(taker);
            // We check for greater than fee spent to allow for spending on gas.
            yield contracts_test_utils_1.expect(beforeETH.minus(afterETH)).to.bignumber.gt(singleFeeAmount);
            yield contracts_test_utils_1.expect(yield env.web3Wrapper.getBalanceInWeiAsync(feeCollector1Address)).to.bignumber.eq(singleFeeAmount);
        }));
        it('should accept ETH after first transfer', () => __awaiter(this, void 0, void 0, function* () {
            yield protocolFees.collectProtocolFee(pool1).awaitTransactionSuccessAsync({ value: singleFeeAmount });
            yield protocolFees.transferFeesForPool(pool1).awaitTransactionSuccessAsync();
            yield protocolFees.collectProtocolFee(pool1).awaitTransactionSuccessAsync({ value: singleFeeAmount });
            yield protocolFees.transferFeesForPool(pool1).awaitTransactionSuccessAsync();
            const balanceWETH = yield weth.balanceOf(staking.address).callAsync();
            // We leave 1 wei of WETH behind.
            yield contracts_test_utils_1.expect(balanceWETH).to.bignumber.eq(singleFeeAmount.times(2).minus(1));
            yield contracts_test_utils_1.expect(yield weth.balanceOf(feeCollector1Address).callAsync()).to.bignumber.equal(1);
            // And no ETH.
            yield contracts_test_utils_1.expect(yield env.web3Wrapper.getBalanceInWeiAsync(feeCollector1Address)).to.bignumber.eq(0);
        }));
        it('should attribute fees correctly', () => __awaiter(this, void 0, void 0, function* () {
            yield protocolFees.collectProtocolFee(pool1).awaitTransactionSuccessAsync({ value: singleFeeAmount });
            yield protocolFees.transferFeesForPool(pool1).awaitTransactionSuccessAsync();
            yield protocolFees.collectProtocolFee(pool2).awaitTransactionSuccessAsync({ value: singleFeeAmount });
            yield protocolFees.transferFeesForPool(pool2).awaitTransactionSuccessAsync();
            const pool1Balance = yield staking.balanceForPool(pool1).callAsync();
            const pool2Balance = yield staking.balanceForPool(pool2).callAsync();
            const balanceWETH = yield weth.balanceOf(staking.address).callAsync();
            yield contracts_test_utils_1.expect(balanceWETH).to.bignumber.equal(singleFeeAmount.times(2).minus(2));
            // We leave 1 wei of WETH behind.
            yield contracts_test_utils_1.expect(pool1Balance).to.bignumber.equal(singleFeeAmount.minus(1));
            yield contracts_test_utils_1.expect(pool2Balance).to.bignumber.equal(singleFeeAmount.minus(1));
            yield contracts_test_utils_1.expect(yield weth.balanceOf(feeCollector1Address).callAsync()).to.bignumber.equal(1);
            yield contracts_test_utils_1.expect(yield weth.balanceOf(feeCollector2Address).callAsync()).to.bignumber.equal(1);
            yield contracts_test_utils_1.expect(pool2Balance).to.bignumber.equal(singleFeeAmount.minus(1));
            // And no ETH.
            yield contracts_test_utils_1.expect(yield env.web3Wrapper.getBalanceInWeiAsync(feeCollector1Address)).to.bignumber.eq(0);
            yield contracts_test_utils_1.expect(yield env.web3Wrapper.getBalanceInWeiAsync(feeCollector2Address)).to.bignumber.eq(0);
        }));
    });
});
//# sourceMappingURL=protocol_fees_test.js.map