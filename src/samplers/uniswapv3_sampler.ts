import { ContractTxFunctionObj } from '@0x/base-contract';
import { BigNumber, ChainId, ERC20BridgeSamplerContract, ERC20BridgeSource, FillData } from '../asset-swapper';
import { UNISWAPV3_CONFIG_BY_CHAIN_ID } from '../asset-swapper/utils/market_operation_utils/constants';
import { SamplerContractOperation } from '../asset-swapper/utils/market_operation_utils/sampler_contract_operation';
import {
    SourceQuoteOperation,
    UniswapV3FillData,
    UniswapV3PathAmount,
} from '../asset-swapper/utils/market_operation_utils/types';

interface BridgeSampler<TFillData extends FillData> {
    createSampleSellsOperation(tokenAddressPath: string[], amounts: BigNumber[]): SourceQuoteOperation<TFillData>;
    createSampleBuysOperation(tokenAddressPath: string[], amounts: BigNumber[]): SourceQuoteOperation<TFillData>;
}

export class UniswapV3Sampler implements BridgeSampler<UniswapV3FillData> {
    private readonly source: ERC20BridgeSource = ERC20BridgeSource.UniswapV3;
    private readonly samplerContract: ERC20BridgeSamplerContract;
    private readonly chainId: ChainId;
    private readonly quoterAddress: string;
    private readonly routerAddress: string;

    constructor(chainId: ChainId, samplerContract: ERC20BridgeSamplerContract) {
        this.chainId = chainId;
        this.samplerContract = samplerContract;
        ({ quoter: this.quoterAddress, router: this.routerAddress } = UNISWAPV3_CONFIG_BY_CHAIN_ID[chainId]);
    }

    createSampleSellsOperation(
        tokenAddressPath: string[],
        amounts: BigNumber[],
    ): SourceQuoteOperation<UniswapV3FillData> {
        return this.createSamplerOperation(
            this.samplerContract.sampleSellsFromUniswapV3,
            'sampleSellsFromUniswapV3',
            tokenAddressPath,
            amounts,
        );
    }

    createSampleBuysOperation(
        tokenAddressPath: string[],
        amounts: BigNumber[],
    ): SourceQuoteOperation<UniswapV3FillData> {
        return this.createSamplerOperation(
            this.samplerContract.sampleBuysFromUniswapV3,
            'sampleBuysFromUniswapV3',
            tokenAddressPath,
            amounts,
        );
    }

    private static postProcessSamplerFunctionOutput(
        amounts: BigNumber[],
        paths: string[],
        gasUsed: BigNumber[],
    ): UniswapV3PathAmount[] {
        return paths.map((uniswapPath, i) => ({
            uniswapPath,
            inputAmount: amounts[i],
            gasUsed: gasUsed[i].toNumber(),
        }));
    }

    private createSamplerOperation(
        samplerFunction: (
            quoter: string,
            path: string[],
            takerTokenAmounts: BigNumber[],
        ) => ContractTxFunctionObj<[string[], BigNumber[], BigNumber[]]>,
        samplerMethodName: string,
        tokenAddressPath: string[],
        amounts: BigNumber[],
    ): SourceQuoteOperation<UniswapV3FillData> {
        return new SamplerContractOperation({
            source: this.source,
            contract: this.samplerContract,
            function: samplerFunction,
            params: [this.quoterAddress, tokenAddressPath, amounts],
            callback: (callResults: string, fillData: UniswapV3FillData): BigNumber[] => {
                const [paths, gasUsed, samples] = this.samplerContract.getABIDecodedReturnData<
                    [string[], BigNumber[], BigNumber[]]
                >(samplerMethodName, callResults);
                fillData.router = this.routerAddress;
                fillData.tokenAddressPath = tokenAddressPath;
                fillData.pathAmounts = UniswapV3Sampler.postProcessSamplerFunctionOutput(amounts, paths, gasUsed);
                return samples;
            },
        });
    }
}
