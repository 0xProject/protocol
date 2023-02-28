import 'mocha';
import * as chai from 'chai';
import { chaiSetup } from '../../utils/chai_setup';
import { UniswapV2Rule } from '../../../../src/asset-swapper/quote_consumers/feature_rules/uniswap_v2_rule';
import { ChainId } from '@0x/contract-addresses';
import { createExchangeProxyWithoutProvider } from '../../../../src/asset-swapper/quote_consumers/quote_consumer_utils';
import { randomAddress } from '@0x/contracts-test-utils';
import { createSimpleSellSwapQuoteWithBridgeOrder, NO_AFFILIATE_FEE, ONE_ETHER } from '../../test_utils/test_data';
import { AffiliateFeeType, ERC20BridgeSource } from '../../../../src/asset-swapper';
import { AbiEncoder, BigNumber, NULL_ADDRESS } from '@0x/utils';

chaiSetup.configure();
const expect = chai.expect;

const EXCHANGE_PROXY_ADDRESS = randomAddress();
const TAKER_TOKEN = randomAddress();
const MAKER_TOKEN = randomAddress();
const TAKER_ADDRESS = randomAddress();

interface SellToUniswapArgs {
    tokens: string[];
    sellAmount: BigNumber;
    minBuyAmount: BigNumber;
    isSushi: boolean;
}

describe('UniswapV2Rule', () => {
    const exchangeProxy = createExchangeProxyWithoutProvider(EXCHANGE_PROXY_ADDRESS);

    const COMPATIBLE_UNI_V2_SWAP_QUOTE = createSimpleSellSwapQuoteWithBridgeOrder({
        source: ERC20BridgeSource.UniswapV2,
        takerToken: TAKER_TOKEN,
        makerToken: MAKER_TOKEN,
        takerAmount: ONE_ETHER,
        makerAmount: ONE_ETHER.times(2),
        slippage: 0,
    });

    const COMPATIBLE_SUSHI_SWAP_SWAP_QUOTE = createSimpleSellSwapQuoteWithBridgeOrder({
        source: ERC20BridgeSource.SushiSwap,
        takerToken: TAKER_TOKEN,
        makerToken: MAKER_TOKEN,
        takerAmount: ONE_ETHER,
        makerAmount: ONE_ETHER.times(2),
        slippage: 0,
    });

    describe('isCompatible', () => {
        it('Returns false for a meta transaction', () => {
            const uniswapV2Rule = UniswapV2Rule.create(ChainId.Mainnet, exchangeProxy);

            const isCompatible = uniswapV2Rule.isCompatible(COMPATIBLE_UNI_V2_SWAP_QUOTE, {
                isFromETH: false,
                isToETH: false,
                sellTokenAffiliateFees: [],
                buyTokenAffiliateFees: [NO_AFFILIATE_FEE],
                refundReceiver: TAKER_ADDRESS,
                metaTransactionVersion: 'v1',
                shouldSellEntireBalance: false,
            });

            expect(isCompatible).to.be.false();
        });

        it('Returns false when there is an affiliate fee', () => {
            const uniswapV2Rule = UniswapV2Rule.create(ChainId.Mainnet, exchangeProxy);

            const isCompatible = uniswapV2Rule.isCompatible(COMPATIBLE_UNI_V2_SWAP_QUOTE, {
                isFromETH: false,
                isToETH: false,
                sellTokenAffiliateFees: [],
                buyTokenAffiliateFees: [
                    {
                        feeType: AffiliateFeeType.PositiveSlippageFee,
                        sellTokenFeeAmount: new BigNumber(0),
                        buyTokenFeeAmount: new BigNumber(4200),
                        recipient: TAKER_ADDRESS,
                    },
                ],
                refundReceiver: NULL_ADDRESS,
                shouldSellEntireBalance: false,
            });

            expect(isCompatible).to.be.false();
        });

        it('Returns false when selling entire balance', () => {
            const uniswapV2Rule = UniswapV2Rule.create(ChainId.Mainnet, exchangeProxy);

            const isCompatible = uniswapV2Rule.isCompatible(COMPATIBLE_UNI_V2_SWAP_QUOTE, {
                isFromETH: false,
                isToETH: false,
                sellTokenAffiliateFees: [],
                buyTokenAffiliateFees: [NO_AFFILIATE_FEE],
                refundReceiver: TAKER_ADDRESS,
                shouldSellEntireBalance: true,
            });

            expect(isCompatible).to.be.false();
        });

        it('Returns false on non-mainnet (Ethereum)', () => {
            const uniswapV2Rule = UniswapV2Rule.create(ChainId.Polygon, exchangeProxy);

            const isCompatible = uniswapV2Rule.isCompatible(COMPATIBLE_UNI_V2_SWAP_QUOTE, {
                isFromETH: false,
                isToETH: false,
                sellTokenAffiliateFees: [],
                buyTokenAffiliateFees: [NO_AFFILIATE_FEE],
                refundReceiver: TAKER_ADDRESS,
                shouldSellEntireBalance: true,
            });

            expect(isCompatible).to.be.false();
        });

        it('Returns true for a UniswapV2 order on mainnet', () => {
            const uniswapV2Rule = UniswapV2Rule.create(ChainId.Mainnet, exchangeProxy);

            const isCompatible = uniswapV2Rule.isCompatible(COMPATIBLE_UNI_V2_SWAP_QUOTE, {
                isFromETH: false,
                isToETH: false,
                sellTokenAffiliateFees: [],
                buyTokenAffiliateFees: [NO_AFFILIATE_FEE],
                refundReceiver: TAKER_ADDRESS,
                shouldSellEntireBalance: false,
            });

            expect(isCompatible).to.be.true();
        });

        it('Returns true for a SushiSwap order on mainnet', () => {
            const uniswapV2Rule = UniswapV2Rule.create(ChainId.Mainnet, exchangeProxy);

            const isCompatible = uniswapV2Rule.isCompatible(COMPATIBLE_SUSHI_SWAP_SWAP_QUOTE, {
                isFromETH: false,
                isToETH: false,
                sellTokenAffiliateFees: [],
                buyTokenAffiliateFees: [NO_AFFILIATE_FEE],
                refundReceiver: TAKER_ADDRESS,
                shouldSellEntireBalance: false,
            });

            expect(isCompatible).to.be.true();
        });

        it('Returns false for non-compatible liquidity source', () => {
            const velodromeSwapQuote = createSimpleSellSwapQuoteWithBridgeOrder({
                source: ERC20BridgeSource.Velodrome,
                takerToken: TAKER_TOKEN,
                makerToken: MAKER_TOKEN,
                takerAmount: ONE_ETHER,
                makerAmount: ONE_ETHER.times(2),
                slippage: 0,
            });

            const uniswapV2Rule = UniswapV2Rule.create(ChainId.Mainnet, exchangeProxy);

            const isCompatible = uniswapV2Rule.isCompatible(velodromeSwapQuote, {
                isFromETH: false,
                isToETH: false,
                sellTokenAffiliateFees: [],
                buyTokenAffiliateFees: [NO_AFFILIATE_FEE],
                refundReceiver: TAKER_ADDRESS,
                shouldSellEntireBalance: false,
            });

            expect(isCompatible).to.be.false();
        });

        // TODO: returns false on multiple orders.
    });

    describe('createCalldata', () => {
        const uniswapV2Rule = UniswapV2Rule.create(ChainId.Mainnet, exchangeProxy);

        it('Returns sellToUniswap calldata for Uniswap V2 (ERC20->ERC20)', () => {
            const calldataInfo = uniswapV2Rule.createCalldata(COMPATIBLE_UNI_V2_SWAP_QUOTE, {
                isFromETH: false,
                isToETH: false,
                sellTokenAffiliateFees: [],
                buyTokenAffiliateFees: [NO_AFFILIATE_FEE],
                refundReceiver: TAKER_ADDRESS,
                shouldSellEntireBalance: false,
            });

            expect(calldataInfo.allowanceTarget).to.eq(EXCHANGE_PROXY_ADDRESS);
            expect(calldataInfo.toAddress).to.eq(EXCHANGE_PROXY_ADDRESS);
            expect(calldataInfo.ethAmount).to.deep.eq(new BigNumber(0));

            const args = decodeSellToUniswap(calldataInfo.calldataHexString);
            expect(args).to.deep.eq({
                tokens: [TAKER_TOKEN, MAKER_TOKEN],
                sellAmount: ONE_ETHER,
                minBuyAmount: ONE_ETHER.times(2),
                isSushi: false,
            });
        });

        it('Returns sellToUniswap calldata for SushiSwap (ERC20->ERC20)', () => {
            const calldataInfo = uniswapV2Rule.createCalldata(COMPATIBLE_SUSHI_SWAP_SWAP_QUOTE, {
                isFromETH: false,
                isToETH: false,
                sellTokenAffiliateFees: [],
                buyTokenAffiliateFees: [NO_AFFILIATE_FEE],
                refundReceiver: TAKER_ADDRESS,
                shouldSellEntireBalance: false,
            });

            expect(calldataInfo.allowanceTarget).to.eq(EXCHANGE_PROXY_ADDRESS);
            expect(calldataInfo.toAddress).to.eq(EXCHANGE_PROXY_ADDRESS);
            expect(calldataInfo.ethAmount).to.deep.eq(new BigNumber(0));

            const args = decodeSellToUniswap(calldataInfo.calldataHexString);
            expect(args).to.deep.eq({
                tokens: [TAKER_TOKEN, MAKER_TOKEN],
                sellAmount: ONE_ETHER,
                minBuyAmount: ONE_ETHER.times(2),
                isSushi: true,
            });
        });
    });

    // TODO Add more test cases:
    // * ETH->ERC20
    // * ERC20->ETH
});

const sellToUniswapEncoder = AbiEncoder.createMethod('sellToUniswap', [
    { type: 'address[]', name: 'tokens' },
    { type: 'uint256', name: 'sellAmount' },
    { type: 'uint256', name: 'minBuyAmount' },
    { type: 'bool', name: 'isSushi' },
]);

function decodeSellToUniswap(calldata: string): SellToUniswapArgs {
    return sellToUniswapEncoder.decode(calldata) as SellToUniswapArgs;
}
