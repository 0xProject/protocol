import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

// This column definition is used to initialize all the previous values in this table to "trade"
const transactionSubmissionTypeIntermediate = new TableColumn({
    name: 'type',
    type: 'varchar',
    isNullable: false,
    default: 'trade', // will be removed right after the migration runs
});

// This column definition is our desired "final" version of this column
const transactionSubmissionTypeFinal = new TableColumn({
    name: 'type',
    type: 'varchar',
    isNullable: false,
});

export class addTypeToTransactionSubmission1657316661200 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // add the column, using a default value to initialize this column

        await queryRunner.addColumn('rfqm_v2_transaction_submissions', transactionSubmissionTypeIntermediate);

        // remove the default value
        queryRunner.changeColumn(
            'rfqm_v2_transaction_submissions',
            transactionSubmissionTypeIntermediate,
            transactionSubmissionTypeFinal,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('rfqm_v2_transaction_submissions', transactionSubmissionTypeFinal);
    }
}
