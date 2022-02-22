import { GEIST_FANTOM_POOLS } from './constants';
import { GeistInfo } from './types';

const gTokenToUnderlyingToken = new Map<string, string>([
    ['0x39b3bd37208cbade74d0fcbdbb12d606295b430a', '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83'], // gFTM => WFTM
    ['0x940f41f0ec9ba1a34cf001cc03347ac092f5f6b5', '0x049d68029688eabf473097a2fc38ef61633a3c7a'], // gFUSDT => fUSDT
    ['0x07e6332dd090d287d3489245038daf987955dcfb', '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e'], // gDAI => WDAI
    ['0xe578c856933d8e1082740bf7661e379aa2a30b26', '0x04068da6c83afcfa0e13ba15a6696662335d5b75'], // gUSDC => WUSDC
    ['0x25c130b2624cf12a4ea30143ef50c5d68cefa22f', '0x74b23882a30290451a17c44f4f05243b6b58c76d'], // gETH => WETH
    ['0x38aca5484b8603373acc6961ecd57a6a594510a3', '0x321162cd933e2be498cd2267a90534a804051b11'], // gWBTC => WBTC
    ['0x690754a168b022331caa2467207c61919b3f8a98', '0x1e4f97b9f9f913c46f1632781732927b9019c68b'], // gCRV => WCRV
    ['0xc664fc7b8487a3e10824cda768c1d239f2403bbe', '0x82f0b8b456c1a451378467398982d4834b6829c1'], // gMIM => MIM
]);

export function getGeistInfoForPair(
    takerToken: string,
    makerToken: string,
): GeistInfo | undefined {
    let gToken;
    let underlyingToken;
    if (gTokenToUnderlyingToken.get(takerToken) === makerToken) {
        gToken = takerToken;
        underlyingToken = makerToken;
    } else if (gTokenToUnderlyingToken.get(makerToken) === takerToken) {
        gToken = makerToken;
        underlyingToken = takerToken;
    } else {
        return undefined;
    }

    return {
        lendingPool: GEIST_FANTOM_POOLS.lendingPool,
        gToken,
        underlyingToken,
    };
}
