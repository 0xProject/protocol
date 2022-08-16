import { FeeTransformer, MetaTransactionTransformer } from '../../src/entities/transformers';
import { MOCK_FEE, MOCK_META_TRANSACTION, MOCK_STORED_FEE, MOCK_STORED_META_TRANSACTION } from '../constants';

describe('transformers', () => {
    describe('MetaTransactionTransformer', () => {
        it('should correctly marshal `MetaTransaction`', async () => {
            expect(MetaTransactionTransformer.to(MOCK_META_TRANSACTION)).toEqual(MOCK_STORED_META_TRANSACTION);
        });

        it('should correctly unmarshal `MetaTransaction` stored in db to `MetaTransaction` object', async () => {
            expect(MetaTransactionTransformer.from(MOCK_STORED_META_TRANSACTION)).toEqual(MOCK_META_TRANSACTION);
        });
    });

    describe('FeeTransformer', () => {
        it('should correctly marshal `Fee`', async () => {
            expect(FeeTransformer.to(MOCK_FEE)).toEqual(MOCK_STORED_FEE);
        });

        it('should correctly unmarshal `Fee` stored in db to `Fee` object', async () => {
            expect(FeeTransformer.from(MOCK_STORED_FEE)).toEqual(MOCK_FEE);
        });
    });
});
