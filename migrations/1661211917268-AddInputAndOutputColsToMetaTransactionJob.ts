import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const inputToken = new TableColumn({
    name: 'input_token',
    type: 'varchar',
});

const outputToken = new TableColumn({
    name: 'output_token',
    type: 'varchar',
});

const inputTokenAmount = new TableColumn({
    name: 'input_token_amount',
    type: 'numeric',
});

const minOutputTokenAmount = new TableColumn({
    name: 'min_output_token_amount',
    type: 'numeric',
});

const settledOutputTokenAmount = new TableColumn({
    name: 'settled_output_token_amount',
    type: 'numeric',
    isNullable: true,
    default: null,
});

export class AddInputAndOutputColsToMetaTransactionJob1661211917268 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns('meta_transaction_jobs', [
            inputToken,
            outputToken,
            inputTokenAmount,
            minOutputTokenAmount,
            settledOutputTokenAmount,
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumns('meta_transaction_jobs', [
            inputToken,
            outputToken,
            inputTokenAmount,
            minOutputTokenAmount,
            settledOutputTokenAmount,
        ]);
    }
}
