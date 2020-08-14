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
    };
}

// Most token metadata taken from https://github.com/MetaMask/eth-contract-metadata/
// And https://github.com/compound-finance/compound-protocol/blob/master/networks/kovan.json
// And https://developer.kyber.network/docs/Environments-Kovan/
// tslint:disable:max-file-line-count
export const TokenMetadatasForChains: TokenMetadataAndChainAddresses[] = [
    {
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x6b175474e89094c44da98b954eedeac495271d0f',
            [ChainId.Kovan]: '0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa',
            [ChainId.Ganache]: '0x34d402f14d58e001d8efbe6585051bf9706aa064',
        },
    },
    {
        symbol: 'REP',
        name: 'Augur Reputation',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x1985365e9f78359a9B6AD760e32412f4a445E862',
            [ChainId.Kovan]: '0x4e5cb5a0caca30d1ad27d8cd8200a907854fb518',
            [ChainId.Ganache]: '0x34d402f14d58e001d8efbe6585051bf9706aa064',
        },
    },
    {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            [ChainId.Kovan]: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
            [ChainId.Ganache]: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
        },
    },
    {
        symbol: 'ZRX',
        name: '0x Protocol Token',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0xe41d2489571d322189246dafa5ebde1f4699f498',
            [ChainId.Kovan]: '0x2002d3812f58e35f0ea1ffbf80a75a38c32175fa',
            [ChainId.Ganache]: '0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c',
        },
    },
    {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        tokenAddresses: {
            [ChainId.Mainnet]: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            [ChainId.Kovan]: '0x75b0622cec14130172eae9cf166b92e5c112faff',
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'BAT',
        name: 'Basic Attention Token',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x0d8775f648430679a709e98d2b0cb6250d2887ef',
            [ChainId.Kovan]: '0x9f8cfb61d3b2af62864408dd703f9c3beb55dff7',
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'MKR',
        name: 'Maker',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
            [ChainId.Kovan]: '0xaaf64bfcc32d0f15873a02163e7e500671a4ffcd',
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 8,
        symbol: 'WBTC',
        name: 'Wrapped BTC',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
            [ChainId.Kovan]: '0xa0a5ad2296b38bd3e3eb59aaeaf1589e8d9a29a9',
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'SNX',
        name: 'Synthetix Network Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'SUSD',
        name: 'sUSD',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x57ab1ec28d129707052df4df418d58a2d46d5f51',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'KNC',
        name: 'Kyber Network Crystal',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xdd974d5c2e2928dea5f71b9825b8b646686bd200',
            [ChainId.Kovan]: '0xad67cb4d63c9da94aca37fdf2761aadf780ff4a2',
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'BNT',
        name: 'Bancor Network Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'GNO',
        name: 'Gnosis Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x6810e776880c02933d47db1b9fc05908e5386b96',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'LINK',
        name: 'Chainlink Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x514910771af9ca656af840dff83e8264ecf986ca',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'REN',
        name: 'Republic Protocol',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x408e41876cccdc0f92210600ef50372656052a38',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'GNT',
        name: 'Golem Network Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xa74476443119a942de498590fe1f2454d7d4ac0d',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'OMG',
        name: 'OmiseGO',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xd26114cd6ee289accf82350c8d8487fedb8a0c07',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'ANT',
        name: 'Aragon Network Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x960b236a07cf122663c4303350609a66a7b288c0',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'SAI',
        name: 'Sai Stablecoin v1.0',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
            [ChainId.Kovan]: '0xc4375b7de8af5a38a93548eb8453a498222c4ff2',
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'CVL',
        name: 'Civil Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x01fa555c97d7958fa6f771f3bbd5ccd508f81e22',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'DTH',
        name: 'Dether',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x5adc961d6ac3f7062d2ea45fefb8d8167d44b190',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'FOAM',
        name: 'FOAM',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x4946fcea7c692606e8908002e55a582af44ac121',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 4,
        symbol: 'AST',
        name: 'AirSwap Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x27054b13b1b798b345b591a4d22e6562d47ea75a',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 8,
        symbol: 'AION',
        name: 'Aion Network',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x4ceda7906a5ed2179785cd3a40a69ee8bc99c466',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'GEN',
        name: 'DAOstack',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x543ff227f64aa17ea132bf9886cab5db55dcaddf',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 8,
        symbol: 'STORJ',
        name: 'Storj',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xb64ef51c888972c908cfacf59b47c1afbc0ab8ac',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'MANA',
        name: 'Decentraland',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'ENTRP',
        name: 'Hut34 Entropy Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x5bc7e5f0ab8b2e10d2d0a3f21739fce62459aef3',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'MLN',
        name: 'Melon',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xbeb9ef514a379b997e0798fdcc901ee474b6d9a1',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'LOOM',
        name: 'Loom Network Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xa4e8c3ec456107ea67d3075bf9e3df3a75823db0',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'CELR',
        name: 'Celer Network Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x4f9254c83eb525f9fcf346490bbb3ed28a81c667',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 9,
        symbol: 'RLC',
        name: 'iExec RLC Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x607f4c5bb672230e8672085532f7e901544a7375',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'ICN',
        name: 'ICONOMI',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x888666ca69e0f178ded6d75b5726cee99a87d698',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 9,
        symbol: 'DGD',
        name: 'Digix',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 12,
        symbol: 'ZIL',
        name: 'Zilliqa',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x05f4a42e251f2d52b8ed15e9fedaacfcef1fad27',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 8,
        symbol: 'cBAT',
        name: 'Compound Basic Attention Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 8,
        symbol: 'cDAI',
        name: 'Compound Dai',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 8,
        symbol: 'cSAI',
        name: 'Compound Sai (Legacy Dai)',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xf5dce57282a584d2746faf1593d3121fcac444dc',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 8,
        symbol: 'cETH',
        name: 'Compound Ether',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 8,
        symbol: 'cREP',
        name: 'Compound Augur',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x158079ee67fce2f58472a96584a73c7ab9ac95c1',
            [ChainId.Kovan]: '0xfd874be7e6733bdc6dca9c7cdd97c225ec235d39',
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 8,
        symbol: 'cUSDC',
        name: 'Compound USD Coin',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x39aa39c021dfbae8fac545936693ac917d5e7563',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 8,
        symbol: 'cZRX',
        name: 'Compound 0x',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407',
            [ChainId.Kovan]: '0xc014dc10a57ac78350c5fddb26bb66f1cb0960a0',
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 8,
        symbol: '0xBTC',
        name: '0xBitcoin Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xb6ed7644c69416d67b522e20bc294a9a9b405b31',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'SNT',
        name: 'Status Network Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x744d70fdbe2ba4cf95131626614a1763df805b9e',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'SPANK',
        name: 'SPANK',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x42d6622dece394b54999fbd73d108123806f6a18',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'BOOTY',
        name: 'BOOTY',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x6b01c3170ae1efebee1a3159172cb3f7a5ecf9e5',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 8,
        symbol: 'UBT',
        name: 'UniBright',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x8400d94a5cb0fa0d041a3788e395285d61c9ee5e',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'ICX',
        name: 'ICON',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xb5a5f22694352c15b00323844ad545abb2b11028',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'NMR',
        name: 'Numeraire',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x1776e1f26f98b1a5df9cd347953a26dd3cb46671',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 2,
        symbol: 'GUSD',
        name: 'Gemini Dollar',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 8,
        symbol: 'FUN',
        name: 'FunFair',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x419d0d8bdd9af5e606ae2232ed285aff190e711b',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'PAX',
        name: 'PAX Stablecoin',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'TUSD',
        name: 'TrueUSD',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x0000000000085d4780b73119b644ae5ecd22b376',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'LPT',
        name: 'Livepeer',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x58b6a8a3302369daec383334672404ee733ab239',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'ENJ',
        name: 'EnjinCoin',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 6,
        symbol: 'POWR',
        name: 'PowerLedger',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x595832f8fc6bf59c85c527fec3740a1b7a361269',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'REQ',
        name: 'Request',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x8f8221afbb33998d8584a2b05749ba73c37a938a',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'DNT',
        name: 'district0x',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x0abdace70d3790235af448c88547603b945604ea',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'MATIC',
        name: 'Matic Network Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'LRC',
        name: 'Loopring',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xbbbbca6a901c926f240b89eacb641d8aec7aeafd',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 18,
        symbol: 'RDN',
        name: 'Raiden Network Token',
        tokenAddresses: {
            [ChainId.Mainnet]: '0x255aa6df07540cb5d3d297f0d0d4d84cb52bc8e6',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        decimals: 6,
        symbol: 'USDT',
        name: 'Tether USD',
        tokenAddresses: {
            [ChainId.Mainnet]: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'ZWETH',
        name: 'Custom Kovan Wrapped Ether',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: NULL_ADDRESS,
            [ChainId.Kovan]: '0x1FcAf05ABa8c7062D6F08E25c77Bf3746fCe5433',
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'ZUSDC',
        name: 'Custom Kovan USD Coin',
        decimals: 6,
        tokenAddresses: {
            [ChainId.Mainnet]: NULL_ADDRESS,
            [ChainId.Kovan]: '0x5a719Cf3E02c17c876F6d294aDb5CB7C6eB47e2F',
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'GST2',
        name: 'Gas Token 2',
        decimals: 2,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x0000000000b3f879cb30fe243b4dfee438691c04',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: '0xbe0037eaf2d64fe5529bca93c18c9702d3930376',
        },
    },
    {
        symbol: 'COMP',
        name: 'Compound',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0xc00e94cb662c3520282e6f5717214004a7f26888',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'UMA',
        name: 'Universal Market Access',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x04fa0d235c4abf4bcf4787af4cf447de572ef828',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'BZRX',
        name: 'bZx Protocol Token',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x56d811088235f11c8920698a204a5010a788f4b3',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'renBTC',
        name: 'renBTC',
        decimals: 8,
        tokenAddresses: {
            [ChainId.Mainnet]: '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'BAL',
        name: 'Balancer',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0xba100000625a3754423978a60c9317c58a424e3d',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'LEND',
        name: 'Aave',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x80fb784b7ed66730e8b1dbd9820afd29931aab03',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'YFI',
        name: 'yearn.finance',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'AMPL',
        name: 'Ampleforth',
        decimals: 9,
        tokenAddresses: {
            [ChainId.Mainnet]: '0xd46ba6d942050d489dbd938a2c909a5d5039a161',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'KEEP',
        name: 'Keep',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x85eee30c52b0b379b046fb0f85f4f3dc3009afec',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'mUSD',
        name: 'mStable USD',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0xe2f2a5c287993345a840db3b0845fbc70f5935a5',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'bUSD',
        name: 'Binance USD',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'CRV',
        name: 'Curve DAO Token',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0xd533a949740bb3306d119cc777fa900ba034cd52',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
];
