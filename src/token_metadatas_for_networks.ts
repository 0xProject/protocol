import { NULL_ADDRESS } from './constants';
import { ChainId } from './types';

export interface TokenMetadataAndChainAddresses {
    symbol: string;
    decimals: number;
    tokenAddresses: {
        [ChainId.Mainnet]: string;
        [ChainId.Kovan]: string;
        [ChainId.Ganache]: string;
    };
}

export const TokenMetadatasForChains: TokenMetadataAndChainAddresses[] = [
    {
        symbol: 'DAI',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x6b175474e89094c44da98b954eedeac495271d0f',
            [ChainId.Kovan]: '0xc4375b7de8af5a38a93548eb8453a498222c4ff2',
            [ChainId.Ganache]: '0x34d402f14d58e001d8efbe6585051bf9706aa064',
        },
    },
    {
        symbol: 'REP',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x1985365e9f78359a9B6AD760e32412f4a445E862',
            [ChainId.Kovan]: '0xb18845c260f680d5b9d84649638813e342e4f8c9',
            [ChainId.Ganache]: '0x34d402f14d58e001d8efbe6585051bf9706aa064',
        },
    },
    {
        symbol: 'WETH',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            [ChainId.Kovan]: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
            [ChainId.Ganache]: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
        },
    },
    {
        symbol: 'ZRX',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0xe41d2489571d322189246dafa5ebde1f4699f498',
            [ChainId.Kovan]: '0x2002d3812f58e35f0ea1ffbf80a75a38c32175fa',
            [ChainId.Ganache]: '0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c',
        },
    },
    {
        symbol: 'USDC',
        decimals: 6,
        tokenAddresses: {
            [ChainId.Mainnet]: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            [ChainId.Kovan]: '0x5a719cf3e02c17c876f6d294adb5cb7c6eb47e2f',
            [ChainId.Ganache]: NULL_ADDRESS, // TODO: get version of ganache snapshot with a dummy USDC preloaded
        },
    },
    {
        symbol: 'BAT',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x0d8775f648430679a709e98d2b0cb6250d2887ef',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
    {
        symbol: 'MKR',
        decimals: 18,
        tokenAddresses: {
            [ChainId.Mainnet]: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
            [ChainId.Kovan]: NULL_ADDRESS,
            [ChainId.Ganache]: NULL_ADDRESS,
        },
    },
];
