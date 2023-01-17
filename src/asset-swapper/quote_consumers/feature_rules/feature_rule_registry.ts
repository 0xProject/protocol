import { ChainId, ContractAddresses } from '@0x/contract-addresses';
import { TransformERC20Rule } from './transform_erc20_rule';
import { FeatureRuleRegistry, FeatureRule } from './types';

export class FeatureRuleRegistryImpl implements FeatureRuleRegistry {
    public static create(chainId: ChainId, contractAddresses: ContractAddresses): FeatureRuleRegistry {
        return new FeatureRuleRegistryImpl(TransformERC20Rule.create(chainId, contractAddresses));
    }

    private constructor(private readonly transformErc20Rule: TransformERC20Rule) {}

    public getTransformErc20Rule(): FeatureRule {
        return this.transformErc20Rule;
    }
}
