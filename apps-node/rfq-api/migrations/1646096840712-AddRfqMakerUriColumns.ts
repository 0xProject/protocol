import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const RfqtUriColumn = new TableColumn({
    name: 'rfqt_uri',
    type: 'varchar',
    isNullable: true,
    default: null,
});

const RfqmUriColumn = new TableColumn({
    name: 'rfqm_uri',
    type: 'varchar',
    isNullable: true,
    default: null,
});

const rfqMakerTableName = 'rfq_maker_pairs';
export class AddRfqMakerUriColumns1646096840712 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(rfqMakerTableName, RfqtUriColumn);
        await queryRunner.addColumn(rfqMakerTableName, RfqmUriColumn);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn(rfqMakerTableName, RfqtUriColumn);
        await queryRunner.dropColumn(rfqMakerTableName, RfqmUriColumn);
    }
}
