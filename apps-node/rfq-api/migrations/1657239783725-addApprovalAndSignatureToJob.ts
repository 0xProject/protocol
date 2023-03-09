import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const approval = new TableColumn({
    name: 'approval',
    type: 'jsonb',
    isNullable: true,
    default: null,
});

const approvalSignature = new TableColumn({
    name: 'approval_signature',
    type: 'jsonb',
    isNullable: true,
    default: null,
});

export class addApprovalAndSignatureToJob1657239783725 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns('rfqm_v2_jobs', [approval, approvalSignature]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumns('rfqm_v2_jobs', [approval, approvalSignature]);
    }
}
