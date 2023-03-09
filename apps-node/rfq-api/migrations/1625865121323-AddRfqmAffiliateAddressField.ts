import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const AffiliateAddressColumn = new TableColumn({
    name: 'affiliate_address',
    type: 'varchar',
    isNullable: true,
});

export class AddRfqmAffiliateAddressField1625865121323 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('rfqm_quotes', AffiliateAddressColumn);
        await queryRunner.addColumn('rfqm_jobs', AffiliateAddressColumn);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('rfqm_quotes', AffiliateAddressColumn);
        await queryRunner.dropColumn('rfqm_jobs', AffiliateAddressColumn);
    }
}
