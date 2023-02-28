import * as chai from 'chai';
import 'mocha';
import {
    BUY_SOURCE_FILTER_BY_CHAIN_ID,
    ChainId,
    ERC20BridgeSource,
    SELL_SOURCE_FILTER_BY_CHAIN_ID,
} from '../../../../src/asset-swapper';

import { chaiSetup } from '../chai_setup';
chaiSetup.configure();
const expect = chai.expect;

describe('Constants', () => {
    describe('Liquidity Sources', () => {
        const allChainIds = Object.values(ChainId).filter((chainId) => !isNaN(Number(chainId))) as ChainId[];

        allChainIds.forEach((chainId) => {
            it(`Supports MultiHop (chainId: ${chainId})`, async () => {
                expect(SELL_SOURCE_FILTER_BY_CHAIN_ID[chainId].isAllowed(ERC20BridgeSource.MultiHop));
                expect(BUY_SOURCE_FILTER_BY_CHAIN_ID[chainId].isAllowed(ERC20BridgeSource.MultiHop));
            });
        });
    });
});
