import { assert as sharedAssert } from '@0x/assert';
import { Web3Wrapper } from '@0x/web3-wrapper';

export const assert = {
    ...sharedAssert,
    async isSenderAddressAsync(
        variableName: string,
        senderAddressHex: string,
        web3Wrapper: Web3Wrapper,
    ): Promise<void> {
        sharedAssert.isETHAddressHex(variableName, senderAddressHex);
        const isSenderAddressAvailable = await web3Wrapper.isSenderAddressAvailableAsync(senderAddressHex);
        sharedAssert.assert(
            isSenderAddressAvailable,
            `Specified ${variableName} ${senderAddressHex} isn't available through the supplied web3 provider`,
        );
    },
};
