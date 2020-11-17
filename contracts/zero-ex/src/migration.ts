import { SupportedProvider } from '@0x/subproviders';
import { SimpleContractArtifact } from '@0x/types';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import { TxData } from 'ethereum-types';
import * as _ from 'lodash';

import { artifacts } from './artifacts';
import {
    FullMigrationContract,
    InitialMigrationContract,
    IZeroExContract,
    LimitOrdersFeatureContract,
    MetaTransactionsFeatureContract,
    OwnableFeatureContract,
    SignatureValidatorFeatureContract,
    SimpleFunctionRegistryFeatureContract,
    TokenSpenderFeatureContract,
    TransformERC20FeatureContract,
    ZeroExContract,
} from './wrappers';

// tslint:disable: completed-docs

/**
 * Addresses of minimum features for a deployment of the Exchange Proxy.
 */
export interface BootstrapFeatures {
    registry: string;
    ownable: string;
}

/**
 * Artifacts to use when deploying bootstrap features.
 */
export interface BootstrapFeatureArtifacts {
    registry: SimpleContractArtifact;
    ownable: SimpleContractArtifact;
}

const DEFAULT_BOOTSTRAP_FEATURE_ARTIFACTS = {
    registry: artifacts.SimpleFunctionRegistryFeature,
    ownable: artifacts.OwnableFeature,
};

/**
 * Deploy the minimum features of the Exchange Proxy.
 */
export async function deployBootstrapFeaturesAsync(
    provider: SupportedProvider,
    txDefaults: Partial<TxData>,
    features: Partial<BootstrapFeatures> = {},
    featureArtifacts: Partial<BootstrapFeatureArtifacts> = {},
): Promise<BootstrapFeatures> {
    const _featureArtifacts = {
        ...DEFAULT_BOOTSTRAP_FEATURE_ARTIFACTS,
        ...featureArtifacts,
    };
    return {
        registry:
            features.registry ||
            (await SimpleFunctionRegistryFeatureContract.deployFrom0xArtifactAsync(
                _featureArtifacts.registry,
                provider,
                txDefaults,
                artifacts,
            )).address,
        ownable:
            features.ownable ||
            (await OwnableFeatureContract.deployFrom0xArtifactAsync(
                _featureArtifacts.ownable,
                provider,
                txDefaults,
                artifacts,
            )).address,
    };
}

/**
 * Migrate an instance of the Exchange proxy with minimum viable features.
 */
export async function initialMigrateAsync(
    owner: string,
    provider: SupportedProvider,
    txDefaults: Partial<TxData>,
    features: Partial<BootstrapFeatures> = {},
): Promise<ZeroExContract> {
    const migrator = await InitialMigrationContract.deployFrom0xArtifactAsync(
        artifacts.InitialMigration,
        provider,
        txDefaults,
        artifacts,
        txDefaults.from as string,
    );
    const zeroEx = await ZeroExContract.deployFrom0xArtifactAsync(
        artifacts.ZeroEx,
        provider,
        txDefaults,
        artifacts,
        migrator.address,
    );
    const _features = await deployBootstrapFeaturesAsync(provider, txDefaults, features);
    await migrator.initializeZeroEx(owner, zeroEx.address, _features).awaitTransactionSuccessAsync();
    return zeroEx;
}

/**
 * Addresses of features for a full deployment of the Exchange Proxy.
 */
export interface FullFeatures extends BootstrapFeatures {
    tokenSpender: string;
    transformERC20: string;
    signatureValidator: string;
    metaTransactions: string;
    limitOrders: string;
}

/**
 * Artifacts to use when deploying full features.
 */
export interface FullFeatureArtifacts extends BootstrapFeatureArtifacts {
    tokenSpender: SimpleContractArtifact;
    transformERC20: SimpleContractArtifact;
    signatureValidator: SimpleContractArtifact;
    metaTransactions: SimpleContractArtifact;
    limitOrders: SimpleContractArtifact;
}

/**
 * Configuration for deploying full features..
 */
export interface FullFeaturesDeployConfig {
    zeroExAddress: string;
    wethAddress: string;
    stakingAddress: string;
    protocolFeeMultiplier: number | BigNumber;
}

/**
 * Configuration options for a full migration of the Exchange Proxy.
 */
export interface FullMigrationConfig extends FullFeaturesDeployConfig {
    transformerDeployer?: string;
}

const DEFAULT_FULL_FEATURES_DEPLOY_CONFIG = {
    zeroExAddress: NULL_ADDRESS,
    wethAddress: NULL_ADDRESS,
    stakingAddress: NULL_ADDRESS,
    protocolFeeMultiplier: 70e3,
};

const DEFAULT_FULL_FEATURES_ARTIFACTS = {
    tokenSpender: artifacts.TokenSpenderFeature,
    transformERC20: artifacts.TransformERC20Feature,
    signatureValidator: artifacts.SignatureValidatorFeature,
    metaTransactions: artifacts.MetaTransactionsFeature,
    limitOrders: artifacts.LimitOrdersFeature,
};

/**
 * Deploy all the features for a full Exchange Proxy.
 */
export async function deployFullFeaturesAsync(
    provider: SupportedProvider,
    txDefaults: Partial<TxData>,
    config: Partial<FullFeaturesDeployConfig> = {},
    features: Partial<FullFeatures> = {},
    featureArtifacts: Partial<FullFeatureArtifacts> = {},
): Promise<FullFeatures> {
    const _config = { ...DEFAULT_FULL_FEATURES_DEPLOY_CONFIG, ...config };
    const _featureArtifacts = {
        ...DEFAULT_FULL_FEATURES_ARTIFACTS,
        ...featureArtifacts,
    };
    return {
        ...(await deployBootstrapFeaturesAsync(provider, txDefaults)),
        tokenSpender:
            features.tokenSpender ||
            (await TokenSpenderFeatureContract.deployFrom0xArtifactAsync(
                _featureArtifacts.tokenSpender,
                provider,
                txDefaults,
                artifacts,
            )).address,
        transformERC20:
            features.transformERC20 ||
            (await TransformERC20FeatureContract.deployFrom0xArtifactAsync(
                _featureArtifacts.transformERC20,
                provider,
                txDefaults,
                artifacts,
            )).address,
        signatureValidator:
            features.signatureValidator ||
            (await SignatureValidatorFeatureContract.deployFrom0xArtifactAsync(
                _featureArtifacts.signatureValidator,
                provider,
                txDefaults,
                artifacts,
            )).address,
        metaTransactions:
            features.metaTransactions ||
            (await MetaTransactionsFeatureContract.deployFrom0xArtifactAsync(
                _featureArtifacts.metaTransactions,
                provider,
                txDefaults,
                artifacts,
                _config.zeroExAddress,
            )).address,
        limitOrders:
            features.limitOrders ||
            (await LimitOrdersFeatureContract.deployFrom0xArtifactAsync(
                _featureArtifacts.limitOrders,
                provider,
                txDefaults,
                artifacts,
                _config.zeroExAddress,
                _config.wethAddress,
                _config.stakingAddress,
                _config.protocolFeeMultiplier,
            )).address,
    };
}

/**
 * Deploy a fully featured instance of the Exchange Proxy.
 */
export async function fullMigrateAsync(
    owner: string,
    provider: SupportedProvider,
    txDefaults: Partial<TxData>,
    features: Partial<FullFeatures> = {},
    config: Partial<FullMigrationConfig> = {},
    featureArtifacts: Partial<FullFeatureArtifacts> = {},
): Promise<IZeroExContract> {
    const migrator = await FullMigrationContract.deployFrom0xArtifactAsync(
        artifacts.FullMigration,
        provider,
        txDefaults,
        artifacts,
        txDefaults.from as string,
    );
    const zeroEx = await ZeroExContract.deployFrom0xArtifactAsync(
        artifacts.ZeroEx,
        provider,
        txDefaults,
        artifacts,
        await migrator.getBootstrapper().callAsync(),
    );
    const _config = { ...config, zeroExAddress: zeroEx.address };
    const _features = await deployFullFeaturesAsync(provider, txDefaults, _config, features, featureArtifacts);
    const migrateOpts = {
        transformerDeployer: txDefaults.from as string,
        ..._config,
    };
    await migrator.migrateZeroEx(owner, zeroEx.address, _features, migrateOpts).awaitTransactionSuccessAsync();
    return new IZeroExContract(zeroEx.address, provider, txDefaults);
}
