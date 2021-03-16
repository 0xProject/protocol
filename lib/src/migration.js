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
const utils_1 = require("@0x/utils");
const artifacts_1 = require("./artifacts");
const constants_1 = require("./constants");
const wrappers_1 = require("./wrappers");
const DEFAULT_BOOTSTRAP_FEATURE_ARTIFACTS = {
    registry: artifacts_1.artifacts.SimpleFunctionRegistryFeature,
    ownable: artifacts_1.artifacts.OwnableFeature,
};
/**
 * Deploy the minimum features of the Exchange Proxy.
 */
function deployBootstrapFeaturesAsync(provider, txDefaults, features = {}, featureArtifacts = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const _featureArtifacts = Object.assign({}, DEFAULT_BOOTSTRAP_FEATURE_ARTIFACTS, featureArtifacts);
        return {
            registry: features.registry ||
                (yield wrappers_1.SimpleFunctionRegistryFeatureContract.deployFrom0xArtifactAsync(_featureArtifacts.registry, provider, txDefaults, artifacts_1.artifacts)).address,
            ownable: features.ownable ||
                (yield wrappers_1.OwnableFeatureContract.deployFrom0xArtifactAsync(_featureArtifacts.ownable, provider, txDefaults, artifacts_1.artifacts)).address,
        };
    });
}
exports.deployBootstrapFeaturesAsync = deployBootstrapFeaturesAsync;
/**
 * Migrate an instance of the Exchange proxy with minimum viable features.
 */
function initialMigrateAsync(owner, provider, txDefaults, features = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const migrator = yield wrappers_1.InitialMigrationContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.InitialMigration, provider, txDefaults, artifacts_1.artifacts, txDefaults.from);
        const zeroEx = yield wrappers_1.ZeroExContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.ZeroEx, provider, txDefaults, artifacts_1.artifacts, migrator.address);
        const _features = yield deployBootstrapFeaturesAsync(provider, txDefaults, features);
        yield migrator.initializeZeroEx(owner, zeroEx.address, _features).awaitTransactionSuccessAsync();
        return zeroEx;
    });
}
exports.initialMigrateAsync = initialMigrateAsync;
const DEFAULT_FULL_FEATURES_DEPLOY_CONFIG = {
    zeroExAddress: utils_1.NULL_ADDRESS,
    wethAddress: utils_1.NULL_ADDRESS,
    stakingAddress: utils_1.NULL_ADDRESS,
    feeCollectorController: utils_1.NULL_ADDRESS,
    protocolFeeMultiplier: 70e3,
    greedyTokensBloomFilter: constants_1.ZERO_BYTES32,
};
const DEFAULT_FULL_FEATURES_ARTIFACTS = {
    tokenSpender: artifacts_1.artifacts.TokenSpenderFeature,
    transformERC20: artifacts_1.artifacts.TransformERC20Feature,
    metaTransactions: artifacts_1.artifacts.MetaTransactionsFeature,
    nativeOrders: artifacts_1.artifacts.NativeOrdersFeature,
    feeCollectorController: artifacts_1.artifacts.FeeCollectorController,
};
/**
 * Deploy all the features for a full Exchange Proxy.
 */
function deployFullFeaturesAsync(provider, txDefaults, config = {}, features = {}, featureArtifacts = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const _config = Object.assign({}, DEFAULT_FULL_FEATURES_DEPLOY_CONFIG, config);
        const _featureArtifacts = Object.assign({}, DEFAULT_FULL_FEATURES_ARTIFACTS, featureArtifacts);
        if (_config.feeCollectorController === utils_1.NULL_ADDRESS) {
            _config.feeCollectorController = (yield wrappers_1.FeeCollectorControllerContract.deployFrom0xArtifactAsync(_featureArtifacts.feeCollectorController, provider, txDefaults, artifacts_1.artifacts, _config.wethAddress, _config.stakingAddress)).address;
        }
        return Object.assign({}, (yield deployBootstrapFeaturesAsync(provider, txDefaults)), { tokenSpender: features.tokenSpender ||
                (yield wrappers_1.TokenSpenderFeatureContract.deployFrom0xArtifactAsync(_featureArtifacts.tokenSpender, provider, txDefaults, artifacts_1.artifacts)).address, transformERC20: features.transformERC20 ||
                (yield wrappers_1.TransformERC20FeatureContract.deployFrom0xArtifactAsync(_featureArtifacts.transformERC20, provider, txDefaults, artifacts_1.artifacts, _config.greedyTokensBloomFilter)).address, metaTransactions: features.metaTransactions ||
                (yield wrappers_1.MetaTransactionsFeatureContract.deployFrom0xArtifactAsync(_featureArtifacts.metaTransactions, provider, txDefaults, artifacts_1.artifacts, _config.zeroExAddress, _config.greedyTokensBloomFilter)).address, nativeOrders: features.nativeOrders ||
                (yield wrappers_1.NativeOrdersFeatureContract.deployFrom0xArtifactAsync(_featureArtifacts.nativeOrders, provider, txDefaults, artifacts_1.artifacts, _config.zeroExAddress, _config.wethAddress, _config.stakingAddress, _config.feeCollectorController, _config.protocolFeeMultiplier, _config.greedyTokensBloomFilter)).address });
    });
}
exports.deployFullFeaturesAsync = deployFullFeaturesAsync;
/**
 * Deploy a fully featured instance of the Exchange Proxy.
 */
function fullMigrateAsync(owner, provider, txDefaults, features = {}, config = {}, featureArtifacts = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const migrator = yield wrappers_1.FullMigrationContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.FullMigration, provider, txDefaults, artifacts_1.artifacts, txDefaults.from);
        const zeroEx = yield wrappers_1.ZeroExContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.ZeroEx, provider, txDefaults, artifacts_1.artifacts, yield migrator.getBootstrapper().callAsync());
        const _config = Object.assign({}, config, { zeroExAddress: zeroEx.address });
        const _features = yield deployFullFeaturesAsync(provider, txDefaults, _config, features, featureArtifacts);
        const migrateOpts = Object.assign({ transformerDeployer: txDefaults.from }, _config);
        yield migrator.migrateZeroEx(owner, zeroEx.address, _features, migrateOpts).awaitTransactionSuccessAsync();
        return new wrappers_1.IZeroExContract(zeroEx.address, provider, txDefaults);
    });
}
exports.fullMigrateAsync = fullMigrateAsync;
//# sourceMappingURL=migration.js.map