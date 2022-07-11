import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

// This column definition is used to initialize all the previous values in this table to 'trade'
const transactionSubmissionTypeIntermediate = new TableColumn({
    name: 'type',
    type: 'varchar',
    isNullable: false,
    default: "'trade'", // temporary default, note the single quotes
});

const transactionSubmissionType = new TableColumn({
    name: 'type',
    type: 'varchar',
    isNullable: false,
});

export class AddTypeToTransactionSubmission1657316661200 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('rfqm_v2_transaction_submissions', transactionSubmissionTypeIntermediate);
        await queryRunner.changeColumn(
            'rfqm_v2_transaction_submissions',
            transactionSubmissionTypeIntermediate,
            transactionSubmissionType,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('rfqm_v2_transaction_submissions', transactionSubmissionType);
    }
}
