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

export class AddRfqMakerUriColumns1646096840712 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('rfq_maker_pairs', RfqtUriColumn);
        await queryRunner.addColumn('rfq_maker_pairs', RfqmUriColumn);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('rfq_maker_pairs', RfqtUriColumn);
        await queryRunner.dropColumn('rfq_maker_pairs', RfqmUriColumn);
    }
}
