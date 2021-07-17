import { BigNumber } from '@0x/utils';

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const NULL_BYTES = '0x';
export const NULL_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const ZERO_AMOUNT = new BigNumber(0);
export const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);
export const DUMMY_PROVIDER: any = {
    sendAsync(): void {
        return;
    },
};
