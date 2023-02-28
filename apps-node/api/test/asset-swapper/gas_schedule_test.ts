import * as chai from 'chai';
import 'mocha';
import { DEFAULT_GAS_SCHEDULE, ERC20BridgeSource, FillQuoteTransformerOrderType } from '../../src/asset-swapper';

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
});
