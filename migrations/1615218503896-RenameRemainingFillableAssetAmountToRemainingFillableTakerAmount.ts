import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameRemainingFillableAssetAmountToRemainingFillableTakerAmount1615218503896
    implements MigrationInterface
{
    name = 'RenameRemainingFillableAssetAmountToRemainingFillableTakerAmount1615218503896';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "signed_orders_v4" RENAME COLUMN "remaining_fillable_taker_asset_amount" TO "remaining_fillable_taker_amount"`,
        );
        await queryRunner.query(
            `ALTER TABLE "persistent_signed_orders_v4" RENAME COLUMN "remaining_fillable_taker_asset_amount" TO "remaining_fillable_taker_amount"`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "persistent_signed_orders_v4" RENAME COLUMN "remaining_fillable_taker_amount" TO "remaining_fillable_taker_asset_amount"`,
        );
        await queryRunner.query(
            `ALTER TABLE "signed_orders_v4" RENAME COLUMN "remaining_fillable_taker_amount" TO "remaining_fillable_taker_asset_amount"`,
        );
    }
}
