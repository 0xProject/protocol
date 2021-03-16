import { SupportedProvider } from '@0x/subproviders';
import { SimpleContractArtifact } from '@0x/types';
import { TxData } from 'ethereum-types';
import { IZeroExContract, ZeroExContract } from './wrappers';
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
/**
 * Deploy the minimum features of the Exchange Proxy.
 */
export declare function deployBootstrapFeaturesAsync(provider: SupportedProvider, txDefaults: Partial<TxData>, features?: Partial<BootstrapFeatures>, featureArtifacts?: Partial<BootstrapFeatureArtifacts>): Promise<BootstrapFeatures>;
/**
 * Migrate an instance of the Exchange proxy with minimum viable features.
 */
export declare function initialMigrateAsync(owner: string, provider: SupportedProvider, txDefaults: Partial<TxData>, features?: Partial<BootstrapFeatures>): Promise<ZeroExContract>;
/**
 * Addresses of features for a full deployment of the Exchange Proxy.
 */
export interface FullFeatures extends BootstrapFeatures {
    tokenSpender: string;
    transformERC20: string;
    metaTransactions: string;
    nativeOrders: string;
}
/**
 * Artifacts to use when deploying full features.
 */
export interface FullFeatureArtifacts extends BootstrapFeatureArtifacts {
    tokenSpender: SimpleContractArtifact;
    transformERC20: SimpleContractArtifact;
    metaTransactions: SimpleContractArtifact;
    nativeOrders: SimpleContractArtifact;
    feeCollectorController: SimpleContractArtifact;
}
/**
 * Configuration for deploying full features..
 */
export interface FullFeaturesDeployConfig {
    zeroExAddress: string;
    wethAddress: string;
    stakingAddress: string;
    protocolFeeMultiplier: number;
    greedyTokensBloomFilter: string;
}
/**
 * Configuration options for a full migration of the Exchange Proxy.
 */
export interface FullMigrationConfig extends FullFeaturesDeployConfig {
    transformerDeployer?: string;
}
/**
 * Deploy all the features for a full Exchange Proxy.
 */
export declare function deployFullFeaturesAsync(provider: SupportedProvider, txDefaults: Partial<TxData>, config?: Partial<FullFeaturesDeployConfig>, features?: Partial<FullFeatures>, featureArtifacts?: Partial<FullFeatureArtifacts>): Promise<FullFeatures>;
/**
 * Deploy a fully featured instance of the Exchange Proxy.
 */
export declare function fullMigrateAsync(owner: string, provider: SupportedProvider, txDefaults: Partial<TxData>, features?: Partial<FullFeatures>, config?: Partial<FullMigrationConfig>, featureArtifacts?: Partial<FullFeatureArtifacts>): Promise<IZeroExContract>;
//# sourceMappingURL=migration.d.ts.map