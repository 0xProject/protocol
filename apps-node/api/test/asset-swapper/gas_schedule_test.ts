import * as chai from 'chai';
import 'mocha';
import { DEFAULT_GAS_SCHEDULE, ERC20BridgeSource, FillQuoteTransformerOrderType } from '../../src/asset-swapper';
import { FinalTickDEXMultiPathFillData } from '../../src/asset-swapper/utils/market_operation_utils/types';

import { chaiSetup } from './utils/chai_setup';

chaiSetup.configure();
const expect = chai.expect;

describe('DEFAULT_GAS_SCHEDULE', () => {
    it('ERC20BridgeSource.Native but missing type', () => {
        const fillData = {};
        const gasSchedule = DEFAULT_GAS_SCHEDULE[ERC20BridgeSource.Native](fillData);
        expect(gasSchedule).to.eq(100e3);
    });

    it('ERC20BridgeSource.Native but fillData is incorrect type', () => {
        const fillData = 'garbage';
        const gasSchedule = DEFAULT_GAS_SCHEDULE[ERC20BridgeSource.Native](fillData);
        expect(gasSchedule).to.eq(100e3);
    });

    it('ERC20BridgeSource.Native LimitOrder', () => {
        const fillData = { type: FillQuoteTransformerOrderType.Limit };
        const gasSchedule = DEFAULT_GAS_SCHEDULE[ERC20BridgeSource.Native](fillData);
        expect(gasSchedule).to.eq(100e3);
    });

    it('ERC20BridgeSource.Native RfqOrder', () => {
        const fillData = { type: FillQuoteTransformerOrderType.Rfq };
        const gasSchedule = DEFAULT_GAS_SCHEDULE[ERC20BridgeSource.Native](fillData);
        expect(gasSchedule).to.eq(100e3);
    });

    it('ERC20BridgeSource.Native OtcOrder', () => {
        const fillData = { type: FillQuoteTransformerOrderType.Otc };
        const gasSchedule = DEFAULT_GAS_SCHEDULE[ERC20BridgeSource.Native](fillData);
        expect(gasSchedule).to.eq(85e3);
    });

    it('ERC20BridgeSource.Native BridgeOrder', () => {
        const fillData = { type: FillQuoteTransformerOrderType.Bridge };
        const gasSchedule = DEFAULT_GAS_SCHEDULE[ERC20BridgeSource.Native](fillData);
        expect(gasSchedule).to.eq(100e3);
    });

    it('Returns rounded up gas estimate', () => {
        const fillData: FinalTickDEXMultiPathFillData = {
            gasUsed: 100e3 + 1,
            path: 'fake-path',
            tokenAddressPath: [],
            router: '',
        };
        const gasSchedule = DEFAULT_GAS_SCHEDULE[ERC20BridgeSource.QuickSwapV3](fillData);
        expect(gasSchedule).to.eq(680_003); // Math.ceil(683002.8)
    });
});
