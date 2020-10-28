import { Numberish } from '@0x/protocol-types';
import { RevertError } from '@0x/utils';

// tslint:disable:max-classes-per-file
export class LiquidityProviderIncompleteSellError extends RevertError {
    constructor(
        providerAddress?: string,
        makerToken?: string,
        takerToken?: string,
        sellAmount?: Numberish,
        boughtAmount?: Numberish,
        minBuyAmount?: Numberish,
    ) {
        super(
            'LiquidityProviderIncompleteSellError',
            'LiquidityProviderIncompleteSellError(address providerAddress, address makerToken, address takerToken, uint256 sellAmount, uint256 boughtAmount, uint256 minBuyAmount)',
            {
                providerAddress,
                makerToken,
                takerToken,
                sellAmount,
                boughtAmount,
                minBuyAmount,
            },
        );
    }
}

export class NoLiquidityProviderForMarketError extends RevertError {
    constructor(xAsset?: string, yAsset?: string) {
        super(
            'NoLiquidityProviderForMarketError',
            'NoLiquidityProviderForMarketError(address xAsset, address yAsset)',
            {
                xAsset,
                yAsset,
            },
        );
    }
}

const types = [LiquidityProviderIncompleteSellError, NoLiquidityProviderForMarketError];

// Register the types we've defined.
for (const type of types) {
    RevertError.registerType(type);
}
