import { ChainId } from '@0x/contract-addresses';
import { IZeroExContract } from '@0x/contract-wrappers';
import { ETH_TOKEN_ADDRESS } from '@0x/protocol-utils';
import { constants } from '../../constants';
import {
    SwapQuote,
    ExchangeProxyContractOpts,
    CalldataInfo,
    ERC20BridgeSource,
    OptimizedMarketBridgeOrder,
} from '../../types';
import { UniswapV2FillData } from '../../utils/market_operation_utils/types';
import { isDirectSwapCompatible } from '../quote_consumer_utils';
import { AbstractFeatureRule } from './abstract_feature_rule';

/**
 * A rule for `UniswapFeature` (Uniswap V2 and SushiSwap).
 */
export class UniswapV2Rule extends AbstractFeatureRule {
    private static readonly SUPPORTED_SOURCES = [ERC20BridgeSource.UniswapV2, ERC20BridgeSource.SushiSwap];

    public static create(chainId: ChainId, exchangeProxy: IZeroExContract): UniswapV2Rule {
        return new UniswapV2Rule(chainId, exchangeProxy);
    }

    private constructor(private readonly chainId: ChainId, private readonly exchangeProxy: IZeroExContract) {
        super();
    }

    public isCompatible(quote: SwapQuote, opts: ExchangeProxyContractOpts): boolean {
        if (this.chainId !== ChainId.Mainnet) {
            return false;
        }

        return isDirectSwapCompatible(quote.path, opts, UniswapV2Rule.SUPPORTED_SOURCES);
    }

    public createCalldata(quote: SwapQuote, opts: ExchangeProxyContractOpts): CalldataInfo {
        const { isToETH, isFromETH } = opts;
        const { sellAmount, minBuyAmount, maxSlippage } = this.getSwapContext(quote, opts);
        const slippedOrder = quote.path.getSlippedOrders(
            maxSlippage,
        )[0] as OptimizedMarketBridgeOrder<UniswapV2FillData>;

        const { fillData, source } = slippedOrder;

        return {
            calldataHexString: this.exchangeProxy
                .sellToUniswap(
                    fillData.tokenAddressPath.map((a, i) => {
                        if (i === 0 && isFromETH) {
                            return ETH_TOKEN_ADDRESS;
                        }
                        if (i === fillData.tokenAddressPath.length - 1 && isToETH) {
                            return ETH_TOKEN_ADDRESS;
                        }
                        return a;
                    }),
                    sellAmount,
                    minBuyAmount,
                    source === ERC20BridgeSource.SushiSwap,
                )
                .getABIEncodedTransactionData(),
            ethAmount: isFromETH ? sellAmount : constants.ZERO_AMOUNT,
            toAddress: this.exchangeProxy.address,
            allowanceTarget: this.exchangeProxy.address,
            gasOverhead: constants.ZERO_AMOUNT,
        };
    }
}
