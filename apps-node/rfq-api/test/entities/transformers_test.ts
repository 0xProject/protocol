import {
    FeeTransformer,
    MetaTransactionTransformer,
    MetaTransactionV2Transformer,
} from '../../src/entities/transformers';
import {
    MOCK_FEE,
    MOCK_META_TRANSACTION,
    MOCK_STORED_FEE,
    MOCK_STORED_META_TRANSACTION,
    MOCK_META_TRANSACTION_V2,
} from '../constants';

describe('transformers', () => {
    describe('MetaTransactionTransformer', () => {
        it('should correctly marshal `MetaTransaction`', async () => {
            expect(MetaTransactionTransformer.to(MOCK_META_TRANSACTION)).toEqual(MOCK_STORED_META_TRANSACTION);
        });

        it('should correctly unmarshal `MetaTransaction` stored in db to `MetaTransaction` object', async () => {
            expect(MetaTransactionTransformer.from(MOCK_STORED_META_TRANSACTION)).toEqual(MOCK_META_TRANSACTION);
        });
    });

    describe('MetaTransactionV2Transformer', () => {
        it('should correctly marshal and unmarshal `MetaTransactionV2`', async () => {
            const storedMetaTransactionV2 = MetaTransactionV2Transformer.to(MOCK_META_TRANSACTION_V2);
            expect(MetaTransactionV2Transformer.from(storedMetaTransactionV2)).toEqual(MOCK_META_TRANSACTION_V2);
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
