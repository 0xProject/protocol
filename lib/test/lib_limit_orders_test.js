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
const artifacts_1 = require("./artifacts");
const orders_1 = require("./utils/orders");
const wrappers_1 = require("./wrappers");
contracts_test_utils_1.blockchainTests('LibLimitOrder tests', env => {
    let testContract;
    before(() => __awaiter(this, void 0, void 0, function* () {
        testContract = yield wrappers_1.TestLibNativeOrderContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestLibNativeOrder, env.provider, env.txDefaults, artifacts_1.artifacts);
    }));
    contracts_test_utils_1.describe('getLimitOrderStructHash()', () => {
        it('returns the correct hash', () => __awaiter(this, void 0, void 0, function* () {
            const order = orders_1.getRandomLimitOrder();
            const structHash = yield testContract.getLimitOrderStructHash(order).callAsync();
            contracts_test_utils_1.expect(structHash).to.eq(order.getStructHash());
        }));
    });
    contracts_test_utils_1.describe('getRfqOrderStructHash()', () => {
        it('returns the correct hash', () => __awaiter(this, void 0, void 0, function* () {
            const order = orders_1.getRandomRfqOrder();
            const structHash = yield testContract.getRfqOrderStructHash(order).callAsync();
            contracts_test_utils_1.expect(structHash).to.eq(order.getStructHash());
        }));
    });
});
//# sourceMappingURL=lib_limit_orders_test.js.map