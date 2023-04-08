import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';

/**
 * Converts `amount` into a base unit amount with 18 digits.
 */
export default function toBaseUnitAmount(amount: BigNumber | string | number, decimals?: number): BigNumber {
    const baseDecimals = decimals !== undefined ? decimals : 18;
    const amountAsBigNumber = new BigNumber(amount);
    const baseUnitAmount = Web3Wrapper.toBaseUnitAmount(amountAsBigNumber, baseDecimals);
    return baseUnitAmount;
}
