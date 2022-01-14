import { ChainId } from '@0x/contract-addresses';
import { MigrationInterface, QueryRunner } from 'typeorm';

import { RFQM_MAKER_ASSET_OFFERINGS, RFQT_MAKER_ASSET_OFFERINGS, RFQ_MAKER_CONFIGS } from '../src/config';
import { RfqMakerPairs } from '../src/entities';
import { pairUtils } from '../src/utils/pair_utils';

const getRfqMakerPairsArray = (): RfqMakerPairs[] => {
    const chainId: ChainId = ChainId.Mainnet;

    return RFQ_MAKER_CONFIGS.map((makerConfig) => {
        const pairKeys: string[] = [];
        if (
            makerConfig.rfqtMakerUri &&
            makerConfig.rfqtOrderTypes.length > 0 &&
            RFQT_MAKER_ASSET_OFFERINGS[makerConfig.rfqtMakerUri]
        ) {
            RFQT_MAKER_ASSET_OFFERINGS[makerConfig.rfqtMakerUri].forEach(([tokenA, tokenB]) => {
                pairKeys.push(pairUtils.toKey(tokenA, tokenB));
            });
        }

        if (
            makerConfig.rfqmMakerUri &&
            makerConfig.rfqmOrderTypes.length > 0 &&
            RFQM_MAKER_ASSET_OFFERINGS[makerConfig.rfqmMakerUri]
        ) {
            RFQM_MAKER_ASSET_OFFERINGS[makerConfig.rfqmMakerUri].forEach(([tokenA, tokenB]) => {
                pairKeys.push(pairUtils.toKey(tokenA, tokenB));
            });
        }

        const pairs = pairUtils.toUniqueArray(pairKeys);

        return new RfqMakerPairs({
            makerId: makerConfig.makerId,
            chainId,
            pairs,
        });
    });
};

export class PopulateRfqMakerPairsTable1639527388617 implements MigrationInterface {
    name = 'PopulateRfqMakerPairsTable1639527388617';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const rfqMakerPairsArray = getRfqMakerPairsArray();
        if (rfqMakerPairsArray.length === 0) {
            return;
        }

        let queryString = `INSERT INTO rfq_maker_pairs (maker_id, chain_id, pairs) VALUES`;
        rfqMakerPairsArray.forEach((rfqMakerPairs) => {
            queryString += `('${rfqMakerPairs.makerId}', '${rfqMakerPairs.chainId}', '${JSON.stringify(
                rfqMakerPairs.pairs,
            )}'),`;
        });
        queryString = queryString.slice(0, -1); // remove last comma

        await queryRunner.query(queryString);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
