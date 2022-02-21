import { GEIST_FANTOM_POOLS } from './constants';
import { GeistInfo } from './types';

const gTokenToUnderlyingToken = new Map<string, string>([
    ['0x39b3bd37208cbade74d0fcbdbb12d606295b430a', '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83'], // gFTM => WFTM
    ['0x940f41f0ec9ba1a34cf001cc03347ac092f5f6b5', '0x049d68029688eAbF473097a2fC38ef61633A3C7A'], // gFUSDT => fUSDT
    ['0x07e6332dd090d287d3489245038daf987955dcfb', '0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E'], // gDAI => DAI
    ['0xe578c856933d8e1082740bf7661e379aa2a30b26', '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75'], // gUSDC => USDC
    ['0x25c130b2624cf12a4ea30143ef50c5d68cefa22f', '0x74b23882a30290451A17c44f4F05243b6b58C76d'], // gETH => ETH
    ['0x38aca5484b8603373acc6961ecd57a6a594510a3', '0x321162Cd933E2Be498Cd2267a90534A804051b11'], // gWBTC => BTC
    ['0x690754a168b022331caa2467207c61919b3f8a98', '0x1E4F97b9f9F913c46F1632781732927B9019C68b'], // gCRV => CRV
    ['0xc664fc7b8487a3e10824cda768c1d239f2403bbe', '0x82f0B8B456c1A451378467398982d4834b6829c1'], // gMIM => MIM
]);

export function getGeistInfoForPair(
    takerToken: string,
    makerToken: string,
): GeistInfo {
    let gToken;
    let underlyingToken;
    if (gTokenToUnderlyingToken.get(takerToken) === makerToken) {
        gToken = takerToken;
        underlyingToken = makerToken;
    } else if (gTokenToUnderlyingToken.get(makerToken) === takerToken) {
        gToken = makerToken;
        underlyingToken = takerToken;
    } else {
        throw new Error('Invalid takerToken or makerToken');
    }

    return {
        lendingPool: GEIST_FANTOM_POOLS.lendingPool,
        gToken,
        underlyingToken,
    };
}
