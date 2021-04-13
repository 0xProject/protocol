import { ETH_TOKEN_ADDRESS } from '@0x/protocol-utils';

import { NULL_ADDRESS } from './constants';
import { ChainId } from './types';

export interface TokenMetadataAndChainAddresses {
    symbol: string;
    decimals: number;
    name: string;
    tokenAddresses: {
        [ChainId.Mainnet]: string;
        [ChainId.Kovan]: string;
        [ChainId.Ganache]: string;
        [ChainId.Rinkeby]: string;
        [ChainId.Ropsten]: string;
        [ChainId.BSC]: string;
    };
}

function valueByChainId<T>(rest: Partial<{ [key in ChainId]: T }>, defaultValue: T): { [key in ChainId]: T } {
    // TODO I don't like this but iterating through enums is weird
    return {
        [ChainId.Mainnet]: defaultValue,
        [ChainId.Ropsten]: defaultValue,
        [ChainId.Rinkeby]: defaultValue,
        [ChainId.Kovan]: defaultValue,
        [ChainId.Ganache]: defaultValue,
        [ChainId.BSC]: defaultValue,
        ...(rest || {}),
    };
}

// Most token metadata taken from https://github.com/MetaMask/eth-contract-metadata/
// And https://github.com/compound-finance/compound-protocol/blob/master/networks/kovan.json
// And https://developer.kyber.network/docs/Environments-Kovan/
// tslint:disable:max-file-line-count
export const TokenMetadatasForChains: TokenMetadataAndChainAddresses[] = [
    {
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        tokenAddresses: valueByChainId({ [ChainId.BSC]: NULL_ADDRESS }, ETH_TOKEN_ADDRESS),
    },
    {
        symbol: 'BNB',
        name: 'BNB',
        decimals: 18,
        tokenAddresses: valueByChainId({ [ChainId.BSC]: ETH_TOKEN_ADDRESS }, NULL_ADDRESS),
    },
    {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                [ChainId.Kovan]: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
                [ChainId.Ganache]: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                [ChainId.BSC]: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'ZRX',
        name: '0x Protocol Token',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xe41d2489571d322189246dafa5ebde1f4699f498',
                [ChainId.Kovan]: '0x2002d3812f58e35f0ea1ffbf80a75a38c32175fa',
                [ChainId.Ganache]: '0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x6b175474e89094c44da98b954eedeac495271d0f',
                [ChainId.Kovan]: '0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa',
                [ChainId.Ganache]: '0x34d402f14d58e001d8efbe6585051bf9706aa064',
                [ChainId.BSC]: '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                [ChainId.Kovan]: '0x75b0622cec14130172eae9cf166b92e5c112faff',
                [ChainId.BSC]: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 6,
        symbol: 'USDT',
        name: 'Tether USD',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'BUSDT',
        name: 'Binance Peg USD-T',
        tokenAddresses: valueByChainId(
            {
                [ChainId.BSC]: '0x55d398326f99059ff775485246999027b3197955',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 8,
        symbol: 'WBTC',
        name: 'Wrapped BTC',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
                [ChainId.Kovan]: '0xa0a5ad2296b38bd3e3eb59aaeaf1589e8d9a29a9',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'UNI',
        name: 'Uniswap Protocol Governance Token',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
                [ChainId.BSC]: '0xbf5140a22578168fd562dccf235e5d43a02ce9b1',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'MKR',
        name: 'Maker',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
                [ChainId.Kovan]: '0xaaf64bfcc32d0f15873a02163e7e500671a4ffcd',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'SNX',
        name: 'Synthetix Network Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'LINK',
        name: 'Chainlink Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x514910771af9ca656af840dff83e8264ecf986ca',
                [ChainId.BSC]: '0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'SUSD',
        name: 'sUSD',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x57ab1ec28d129707052df4df418d58a2d46d5f51',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'TUSD',
        name: 'TrueUSD',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x0000000000085d4780b73119b644ae5ecd22b376',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'SUSHI',
        name: 'Sushi',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
                [ChainId.BSC]: '0x947950bcc74888a40ffa2593c5798f11fc9124c4',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'AAVE',
        name: 'Aave',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'YFI',
        name: 'yearn.finance',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'BAT',
        name: 'Basic Attention Token',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x0d8775f648430679a709e98d2b0cb6250d2887ef',
                [ChainId.Kovan]: '0x9f8cfb61d3b2af62864408dd703f9c3beb55dff7',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'KNC',
        name: 'Kyber Network Crystal',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xdd974d5c2e2928dea5f71b9825b8b646686bd200',
                [ChainId.Kovan]: '0xad67cb4d63c9da94aca37fdf2761aadf780ff4a2',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'BNT',
        name: 'Bancor Network Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'BAL',
        name: 'Balancer',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xba100000625a3754423978a60c9317c58a424e3d',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'COMP',
        name: 'Compound',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xc00e94cb662c3520282e6f5717214004a7f26888',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'GNO',
        name: 'Gnosis Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x6810e776880c02933d47db1b9fc05908e5386b96',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'REN',
        name: 'Republic Protocol',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x408e41876cccdc0f92210600ef50372656052a38',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'GNT',
        name: 'Golem Network Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xa74476443119a942de498590fe1f2454d7d4ac0d',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'OMG',
        name: 'OmiseGO',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xd26114cd6ee289accf82350c8d8487fedb8a0c07',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'ANT',
        name: 'Aragon Network Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x960b236a07cf122663c4303350609a66a7b288c0',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'SAI',
        name: 'Sai Stablecoin v1.0',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
                [ChainId.Kovan]: '0xc4375b7de8af5a38a93548eb8453a498222c4ff2',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'CVL',
        name: 'Civil Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x01fa555c97d7958fa6f771f3bbd5ccd508f81e22',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'DTH',
        name: 'Dether',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x5adc961d6ac3f7062d2ea45fefb8d8167d44b190',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'FOAM',
        name: 'FOAM',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x4946fcea7c692606e8908002e55a582af44ac121',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 4,
        symbol: 'AST',
        name: 'AirSwap Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x27054b13b1b798b345b591a4d22e6562d47ea75a',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 8,
        symbol: 'AION',
        name: 'Aion Network',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x4ceda7906a5ed2179785cd3a40a69ee8bc99c466',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'GEN',
        name: 'DAOstack',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x543ff227f64aa17ea132bf9886cab5db55dcaddf',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 8,
        symbol: 'STORJ',
        name: 'Storj',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xb64ef51c888972c908cfacf59b47c1afbc0ab8ac',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'MANA',
        name: 'Decentraland',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'ENTRP',
        name: 'Hut34 Entropy Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x5bc7e5f0ab8b2e10d2d0a3f21739fce62459aef3',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'MLN',
        name: 'Melon',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xbeb9ef514a379b997e0798fdcc901ee474b6d9a1',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'LOOM',
        name: 'Loom Network Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xa4e8c3ec456107ea67d3075bf9e3df3a75823db0',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'CELR',
        name: 'Celer Network Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x4f9254c83eb525f9fcf346490bbb3ed28a81c667',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 9,
        symbol: 'RLC',
        name: 'iExec RLC Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x607f4c5bb672230e8672085532f7e901544a7375',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'ICN',
        name: 'ICONOMI',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x888666ca69e0f178ded6d75b5726cee99a87d698',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 9,
        symbol: 'DGD',
        name: 'Digix',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 12,
        symbol: 'ZIL',
        name: 'Zilliqa',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x05f4a42e251f2d52b8ed15e9fedaacfcef1fad27',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 8,
        symbol: 'cBAT',
        name: 'Compound Basic Attention Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 8,
        symbol: 'cDAI',
        name: 'Compound Dai',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 8,
        symbol: 'cSAI',
        name: 'Compound Sai (Legacy Dai)',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xf5dce57282a584d2746faf1593d3121fcac444dc',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 8,
        symbol: 'cETH',
        name: 'Compound Ether',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 8,
        symbol: 'cREP',
        name: 'Compound Augur',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x158079ee67fce2f58472a96584a73c7ab9ac95c1',
                [ChainId.Kovan]: '0xfd874be7e6733bdc6dca9c7cdd97c225ec235d39',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 8,
        symbol: 'cUSDC',
        name: 'Compound USD Coin',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x39aa39c021dfbae8fac545936693ac917d5e7563',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 8,
        symbol: 'cZRX',
        name: 'Compound 0x',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407',
                [ChainId.Kovan]: '0xc014dc10a57ac78350c5fddb26bb66f1cb0960a0',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 8,
        symbol: '0xBTC',
        name: '0xBitcoin Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xb6ed7644c69416d67b522e20bc294a9a9b405b31',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'SNT',
        name: 'Status Network Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x744d70fdbe2ba4cf95131626614a1763df805b9e',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'SPANK',
        name: 'SPANK',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x42d6622dece394b54999fbd73d108123806f6a18',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'BOOTY',
        name: 'BOOTY',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x6b01c3170ae1efebee1a3159172cb3f7a5ecf9e5',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 8,
        symbol: 'UBT',
        name: 'UniBright',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x8400d94a5cb0fa0d041a3788e395285d61c9ee5e',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'NMR',
        name: 'Numeraire',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x1776e1f26f98b1a5df9cd347953a26dd3cb46671',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 2,
        symbol: 'GUSD',
        name: 'Gemini Dollar',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 8,
        symbol: 'FUN',
        name: 'FunFair',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x419d0d8bdd9af5e606ae2232ed285aff190e711b',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'PAX',
        name: 'PAX Stablecoin',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'LPT',
        name: 'Livepeer',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x58b6a8a3302369daec383334672404ee733ab239',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'ENJ',
        name: 'EnjinCoin',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 6,
        symbol: 'POWR',
        name: 'PowerLedger',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x595832f8fc6bf59c85c527fec3740a1b7a361269',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'REQ',
        name: 'Request',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x8f8221afbb33998d8584a2b05749ba73c37a938a',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'DNT',
        name: 'district0x',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x0abdace70d3790235af448c88547603b945604ea',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'MATIC',
        name: 'Matic Network Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'LRC',
        name: 'Loopring',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xbbbbca6a901c926f240b89eacb641d8aec7aeafd',
            },
            NULL_ADDRESS,
        ),
    },
    {
        decimals: 18,
        symbol: 'RDN',
        name: 'Raiden Network Token',
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x255aa6df07540cb5d3d297f0d0d4d84cb52bc8e6',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'ZWETH',
        name: 'Custom Kovan Wrapped Ether',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: NULL_ADDRESS,
                [ChainId.Kovan]: '0x1FcAf05ABa8c7062D6F08E25c77Bf3746fCe5433',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'ZUSDC',
        name: 'Custom Kovan USD Coin',
        decimals: 6,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: NULL_ADDRESS,
                [ChainId.Kovan]: '0x5a719Cf3E02c17c876F6d294aDb5CB7C6eB47e2F',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'GST2',
        name: 'Gas Token 2',
        decimals: 2,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x0000000000b3f879cb30fe243b4dfee438691c04',

                [ChainId.Ganache]: '0xbe0037eaf2d64fe5529bca93c18c9702d3930376',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'UMA',
        name: 'Universal Market Access',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x04fa0d235c4abf4bcf4787af4cf447de572ef828',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'BZRX',
        name: 'bZx Protocol Token',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x56d811088235f11c8920698a204a5010a788f4b3',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'renBTC',
        name: 'renBTC',
        decimals: 8,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'LEND',
        name: 'Aave',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x80fb784b7ed66730e8b1dbd9820afd29931aab03',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'AMPL',
        name: 'Ampleforth',
        decimals: 9,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xd46ba6d942050d489dbd938a2c909a5d5039a161',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'KEEP',
        name: 'Keep',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x85eee30c52b0b379b046fb0f85f4f3dc3009afec',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'mUSD',
        name: 'mStable USD',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xe2f2a5c287993345a840db3b0845fbc70f5935a5',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'bUSD',
        name: 'Binance USD',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
                [ChainId.BSC]: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'CRV',
        name: 'Curve DAO Token',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xd533a949740bb3306d119cc777fa900ba034cd52',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'swUSD',
        name: 'Swerve.fi swUSD',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x77C6E4a580c0dCE4E5c7a17d0bc077188a83A059',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'SWRV',
        name: 'Swerve DAO Token',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xB8BAa0e4287890a5F79863aB62b7F175ceCbD433',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'sBTC',
        name: 'Synth sBTC',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xfe18be6b3bd88a2d2a7f928d00292e7a9963cfc6',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'yUSD',
        name: 'yearn Curve.fi yDAI/yUSDC/yUSDT/yTUSD',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x5dbcf33d8c2e976c6b560249878e6f1491bca25c',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'ybCRV',
        name: 'yearn Curve.fi yDAI/yUSDC/yUSDT/yBUSD',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x2994529c0652d127b7842094103715ec5299bbed',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'yUSDC',
        name: 'yearn USDC',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x597ad1e0c13bfe8025993d9e79c69e1c0233522e',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'yDAI',
        name: 'yearn DAI',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xacd43e627e64355f1861cec6d3a6688b31a6f952',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'yUSDT',
        name: 'yearn USDT',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x2f08119c6f07c006695e079aafc638b8789faf18',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'yTUSD',
        name: 'yearn TUSD',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x37d19d1c4e1fa9dc47bd1ea12f742a0887eda74a',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'AKRO',
        name: 'Akropolis',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x8ab7404063ec4dbcfd4598215992dc3f8ec853d7',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'AUDIO',
        name: 'Audius',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x18aaa7115705e8be94bffebde57af9bfc265b998',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'BAND',
        name: 'Band Protocol',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xba11d00c5f74255f56a5e366f4f77f5a186d7f55',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'BASED',
        name: 'Based Money',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x68a118ef45063051eac49c7e647ce5ace48a68a5',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'BUSD',
        name: 'Binance USD',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x4fabb145d64652a948d72533023f6e7a623c7c53',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'CREAM',
        name: 'Cream',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x2ba592f78db6436527729929aaf6c908497cb200',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'DONUT',
        name: 'Donut',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xc0f9bd5fa5698b6505f643900ffa515ea5df54a9',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'MTA',
        name: 'Meta',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xa3bed4e1c75d00fa6f4e5e6922db7261b5e9acd2',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'mUSD',
        name: 'mStable USD',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0xe2f2a5c287993345a840db3b0845fbc70f5935a5',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'PAXG',
        name: 'PAX Gold',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x45804880de22913dafe09f4980848ece6ecbaf78',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'PICKLE',
        name: 'Pickle Finance',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x429881672b9ae42b8eba0e26cd9c73711b891ca5',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'RENZEC',
        name: 'renZEC',
        decimals: 8,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x1c5db575e2ff833e46a2e9864c22f4b22e0b37c2',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'REP',
        name: 'Augur',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x221657776846890989a759ba2973e427dff5c9bb',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'SETH',
        name: 'sETH',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x5e74c9036fb86bd7ecdcb084a0673efc32ea31cb',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'STAKE',
        name: 'xDAI Stake',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x0ae055097c6d159879521c384f1d2123d1f195e6',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'TBTC',
        name: 'tBTC',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x8daebade922df735c38c80c7ebd708af50815faa',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: '1INCH',
        name: '1INCH',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.Mainnet]: '0x111111111117dc0aa78b770fa6a738034120c302',
                [ChainId.BSC]: '0x111111111117dc0aa78b770fa6a738034120c302',
            },
            NULL_ADDRESS,
        ),
    },
    {
        symbol: 'WBNB',
        name: 'WBNB',
        decimals: 18,
        tokenAddresses: valueByChainId(
            {
                [ChainId.BSC]: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
            },
            NULL_ADDRESS,
        ),
    },
];
