import { constants, getRandomInteger, randomAddress } from '@0x/contracts-test-utils';
import { ERC1155Order, ERC721Order } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

/**
 * Generate a random ERC721 Order
 */
export function getRandomERC721Order(fields: Partial<ERC721Order> = {}): ERC721Order {
    return new ERC721Order({
        erc20Token: randomAddress(),
        erc20TokenAmount: getRandomInteger('1e18', '10e18'),
        erc721Token: randomAddress(),
        erc721TokenId: getRandomInteger(0, constants.MAX_UINT256),
        maker: randomAddress(),
        taker: randomAddress(),
        erc721TokenProperties: [],
        fees: [],
        nonce: getRandomInteger(0, constants.MAX_UINT256),
        expiry: new BigNumber(Math.floor(Date.now() / 1000 + 60)),
        ...fields,
    });
}
/**
 * Generate a random ERC1155 Order
 */
export function getRandomERC1155Order(fields: Partial<ERC1155Order> = {}): ERC1155Order {
    return new ERC1155Order({
        erc20Token: randomAddress(),
        erc20TokenAmount: getRandomInteger('1e18', '10e18'),
        erc1155Token: randomAddress(),
        erc1155TokenId: getRandomInteger(0, constants.MAX_UINT256),
        erc1155TokenAmount: getRandomInteger(1, '10e18'),
        maker: randomAddress(),
        taker: randomAddress(),
        erc1155TokenProperties: [],
        fees: [],
        nonce: getRandomInteger(0, constants.MAX_UINT256),
        expiry: new BigNumber(Math.floor(Date.now() / 1000 + 60)),
        ...fields,
    });
}
