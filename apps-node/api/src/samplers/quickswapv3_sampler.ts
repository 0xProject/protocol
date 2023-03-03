import { ContractTxFunctionObj } from '@0x/base-contract';
import { BigNumber, ChainId, ERC20BridgeSamplerContract, ERC20BridgeSource } from '../asset-swapper';
import { QUICKSWAPV3_CONFIG_BY_CHAIN_ID } from '../asset-swapper/utils/market_operation_utils/constants';
import { SamplerContractOperation } from '../asset-swapper/utils/market_operation_utils/sampler_contract_operation';
import {
    SourceQuoteOperation,
    TickDEXMultiPathFillData,
    PathAmount,
} from '../asset-swapper/utils/market_operation_utils/types';
import { BridgeSampler } from './types';

export class QuickswapV3Sampler implements BridgeSampler<TickDEXMultiPathFillData> {
    private readonly source: ERC20BridgeSource = ERC20BridgeSource.QuickSwapV3;
    private readonly samplerContract: ERC20BridgeSamplerContract;
    private readonly quoterAddress: string;
    private readonly factoryAddress: string;
    private readonly routerAddress: string;

    constructor(chainId: ChainId, samplerContract: ERC20BridgeSamplerContract) {
        this.samplerContract = samplerContract;
        ({
            quoter: this.quoterAddress,
            factory: this.factoryAddress,
            router: this.routerAddress,
        } = QUICKSWAPV3_CONFIG_BY_CHAIN_ID[chainId]);
    }

    createSampleSellsOperation(
        tokenAddressPath: string[],
        amounts: BigNumber[],
    ): SourceQuoteOperation<TickDEXMultiPathFillData> {
        return this.createSamplerOperation(
            this.samplerContract.sampleSellsFromAlgebra,
            'sampleSellsFromAlgebra',
            tokenAddressPath,
            amounts,
        );
    }

    createSampleBuysOperation(
        tokenAddressPath: string[],
        amounts: BigNumber[],
    ): SourceQuoteOperation<TickDEXMultiPathFillData> {
        return this.createSamplerOperation(
            this.samplerContract.sampleBuysFromAlgebra,
            'sampleBuysFromAlgebra',
            tokenAddressPath,
            amounts,
        );
    }

    private static postProcessSamplerFunctionOutput(
        path: string,
        amounts: BigNumber[],
        gasUsed: BigNumber[],
    ): PathAmount[] {
        if (path == '0x') {
            return [];
        }
        return amounts.map((amount, i) => ({
            path,
            inputAmount: amount,
            gasUsed: gasUsed[i].toNumber(),
        }));
    }

    private createSamplerOperation(
        samplerFunction: (
            quoter: string,
            factory: string,
            path: string[],
            takerTokenAmounts: BigNumber[],
        ) => ContractTxFunctionObj<[string, BigNumber[], BigNumber[]]>,
        samplerMethodName: string,
        tokenAddressPath: string[],
        amounts: BigNumber[],
    ): SourceQuoteOperation<TickDEXMultiPathFillData> {
        return new SamplerContractOperation({
            source: this.source,
            contract: this.samplerContract,
            function: samplerFunction,
            params: [this.quoterAddress, this.factoryAddress, tokenAddressPath, amounts],
            callback: (callResults: string, fillData: TickDEXMultiPathFillData): BigNumber[] => {
                const [path, gasUsed, samples] = this.samplerContract.getABIDecodedReturnData<
                    [string, BigNumber[], BigNumber[]]
                >(samplerMethodName, callResults);
                fillData.router = this.routerAddress;
                fillData.tokenAddressPath = tokenAddressPath;
                fillData.pathAmounts = QuickswapV3Sampler.postProcessSamplerFunctionOutput(path, amounts, gasUsed);
                return samples;
            },
        });
    }
}
