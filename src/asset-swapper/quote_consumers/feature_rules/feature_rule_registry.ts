import { ChainId, ContractAddresses } from '@0x/contract-addresses';
import { createExchangeProxyWithoutProvider } from '../quote_consumer_utils';
import { TransformERC20Rule } from './transform_erc20_rule';
import { FeatureRuleRegistry, FeatureRule } from './types';
import { UniswapV2Rule } from './uniswap_v2_rule';

export class FeatureRuleRegistryImpl implements FeatureRuleRegistry {
    public static create(chainId: ChainId, contractAddresses: ContractAddresses): FeatureRuleRegistry {
        const exchangeProxy = createExchangeProxyWithoutProvider(contractAddresses.exchangeProxy);
        return new FeatureRuleRegistryImpl(
            UniswapV2Rule.create(chainId, exchangeProxy),
            TransformERC20Rule.create(chainId, contractAddresses),
        );
    }

    private constructor(
        private readonly uniswapV2Rule: UniswapV2Rule,
        private readonly transformErc20Rule: TransformERC20Rule,
    ) {}

    public getUniswapV2Rule(): FeatureRule {
        return this.uniswapV2Rule;
    }

    public getTransformErc20Rule(): FeatureRule {
        return this.transformErc20Rule;
    }
}
