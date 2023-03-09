import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const llRejectPriceDifferenceBps = new TableColumn({
    name: 'll_reject_price_difference_bps',
    type: 'integer',
    isNullable: true,
    default: null,
});

export class AddLLPriceRejectionBpsToV2Job1646689728252 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('rfqm_v2_jobs', llRejectPriceDifferenceBps);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('rfqm_v2_jobs', llRejectPriceDifferenceBps);
    }
}
