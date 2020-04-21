import { ERC20BridgeSource } from '@0x/asset-swapper';

export const parseUtils = {
    parseStringArrForERC20BridgeSources(excludedSources: string[]): ERC20BridgeSource[] {
        // Need to compare value of the enum instead of the key, as values are used by asset-swapper
        // CurveUsdcDaiUsdt = 'Curve_USDC_DAI_USDT' is excludedSources=Curve_USDC_DAI_USDT
        return excludedSources
            .map(source => (source === '0x' ? 'Native' : source))
            .filter((source: string) =>
                Object.keys(ERC20BridgeSource).find((k: any) => ERC20BridgeSource[k] === source),
            ) as ERC20BridgeSource[];
    },
};
