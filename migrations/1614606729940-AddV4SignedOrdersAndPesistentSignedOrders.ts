import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddV4SignedOrdersAndPesistentSignedOrders1614606729940 implements MigrationInterface {
    name = 'AddV4SignedOrdersAndPesistentSignedOrders1614606729940';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "maker_address_idx"`);
        await queryRunner.query(`DROP INDEX "taker_asset_data_idx"`);
        await queryRunner.query(`DROP INDEX "maker_asset_data_idx"`);
        await queryRunner.query(`DROP INDEX "maker_taker_asset_data_idx"`);
        await queryRunner.query(`DROP INDEX "persistent_signed_orders_maker_address"`);
        await queryRunner.query(`DROP INDEX "persistent_signed_orders_maker_asset_data"`);
        await queryRunner.query(`DROP INDEX "persistent_signed_orders_taker_asset_data"`);
        await queryRunner.query(`DROP INDEX "persistent_signed_orders_fee_recipient_address"`);
        await queryRunner.query(
            `CREATE TABLE "signed_orders_v4" ("hash" character varying NOT NULL, "maker_token" character varying NOT NULL, "taker_token" character varying NOT NULL, "maker_amount" character varying NOT NULL, "taker_amount" character varying NOT NULL, "maker" character varying NOT NULL, "taker" character varying NOT NULL, "pool" character varying NOT NULL, "expiry" character varying NOT NULL, "salt" character varying NOT NULL, "verifying_contract" character varying NOT NULL, "taker_token_fee_amount" character varying NOT NULL, "sender" character varying NOT NULL, "fee_recipient" character varying NOT NULL, "signature" character varying NOT NULL, "remaining_fillable_taker_asset_amount" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_714e263c3ab18702fd2b7dcc81d" PRIMARY KEY ("hash"))`,
        );
        await queryRunner.query(`CREATE INDEX "IDX_76bc9b369586c456c859954985" ON "signed_orders_v4" ("maker_token") `);
        await queryRunner.query(`CREATE INDEX "IDX_54df2445e48dc18c0b2a527c09" ON "signed_orders_v4" ("taker_token") `);
        await queryRunner.query(`CREATE INDEX "IDX_26555576da615837180cb1c38a" ON "signed_orders_v4" ("maker") `);
        await queryRunner.query(
            `CREATE INDEX "IDX_f77a0ddf2b4f9aaf9658ef6fe9" ON "signed_orders_v4" ("fee_recipient") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_09103afc9d57f4ef5a99d4159c" ON "signed_orders_v4" ("maker_token", "taker_token") `,
        );
        await queryRunner.query(
            `CREATE TYPE "persistent_signed_orders_v4_state_enum" AS ENUM('ADDED', 'FILLED', 'FULLY_FILLED', 'CANCELLED', 'EXPIRED', 'INVALID', 'UNEXPIRED', 'UNFUNDED', 'FILLABILITY_INCREASED', 'STOPPED_WATCHING')`,
        );
        await queryRunner.query(
            `CREATE TABLE "persistent_signed_orders_v4" ("hash" character varying NOT NULL, "maker_token" character varying NOT NULL, "taker_token" character varying NOT NULL, "maker_amount" character varying NOT NULL, "taker_amount" character varying NOT NULL, "maker" character varying NOT NULL, "taker" character varying NOT NULL, "pool" character varying NOT NULL, "expiry" character varying NOT NULL, "salt" character varying NOT NULL, "verifying_contract" character varying NOT NULL, "taker_token_fee_amount" character varying NOT NULL, "sender" character varying NOT NULL, "fee_recipient" character varying NOT NULL, "signature" character varying NOT NULL, "remaining_fillable_taker_asset_amount" character varying NOT NULL, "state" "persistent_signed_orders_v4_state_enum" NOT NULL DEFAULT 'ADDED', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e4d7a1964eb56734463b19681fa" PRIMARY KEY ("hash"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_3bd8111c0502847f405082b582" ON "persistent_signed_orders_v4" ("maker_token") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_d611fdbc7da0effe48c103ac77" ON "persistent_signed_orders_v4" ("taker_token") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_7648bdf4a96ddc5cc7cfbc0135" ON "persistent_signed_orders_v4" ("maker") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_d90a05126f2d3ce3bb87795abb" ON "persistent_signed_orders_v4" ("fee_recipient") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_1d7ff682d2e12e7a7ddc0c83f0" ON "persistent_signed_orders_v4" ("maker_token", "taker_token") `,
        );
        await queryRunner.query(
            `ALTER TYPE "public"."persistent_signed_orders_state_enum" RENAME TO "persistent_signed_orders_state_enum_old"`,
        );
        await queryRunner.query(
            `CREATE TYPE "persistent_signed_orders_state_enum" AS ENUM('ADDED', 'FILLED', 'FULLY_FILLED', 'CANCELLED', 'EXPIRED', 'INVALID', 'UNEXPIRED', 'UNFUNDED', 'FILLABILITY_INCREASED', 'STOPPED_WATCHING')`,
        );
        await queryRunner.query(`ALTER TABLE "persistent_signed_orders" ALTER COLUMN "state" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "persistent_signed_orders" ALTER COLUMN "state" TYPE "persistent_signed_orders_state_enum" USING "state"::"text"::"persistent_signed_orders_state_enum"`,
        );
        await queryRunner.query(`ALTER TABLE "persistent_signed_orders" ALTER COLUMN "state" SET DEFAULT 'ADDED'`);
        await queryRunner.query(`DROP TYPE "persistent_signed_orders_state_enum_old"`);
        await queryRunner.query(`COMMENT ON COLUMN "persistent_signed_orders"."state" IS NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_a1dbbf59a1391d305172e0a583" ON "signed_orders" ("maker_address") `);
        await queryRunner.query(
            `CREATE INDEX "IDX_b7c73c195afc83776fe074bb40" ON "signed_orders" ("maker_asset_data") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_84faecdb7b72b3cdd554f0204c" ON "signed_orders" ("taker_asset_data") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_84496be49e1e0e71cb31de28bf" ON "signed_orders" ("fee_recipient_address") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_7c96bb31393495ae3ec6300920" ON "signed_orders" ("maker_asset_data", "taker_asset_data") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_485f18e568ea778cd2dd88c3af" ON "persistent_signed_orders" ("maker_address") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_9854d3181abb2b9fd643f1417d" ON "persistent_signed_orders" ("maker_asset_data") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_09def10d6cc38e4d31a9e0b5db" ON "persistent_signed_orders" ("taker_asset_data") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_f181036ca90bfe6d7507447b33" ON "persistent_signed_orders" ("fee_recipient_address") `,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_f0cdd27b9c39b059858a005878" ON "persistent_signed_orders" ("maker_asset_data", "taker_asset_data") `,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_f0cdd27b9c39b059858a005878"`);
        await queryRunner.query(`DROP INDEX "IDX_f181036ca90bfe6d7507447b33"`);
        await queryRunner.query(`DROP INDEX "IDX_09def10d6cc38e4d31a9e0b5db"`);
        await queryRunner.query(`DROP INDEX "IDX_9854d3181abb2b9fd643f1417d"`);
        await queryRunner.query(`DROP INDEX "IDX_485f18e568ea778cd2dd88c3af"`);
        await queryRunner.query(`DROP INDEX "IDX_7c96bb31393495ae3ec6300920"`);
        await queryRunner.query(`DROP INDEX "IDX_84496be49e1e0e71cb31de28bf"`);
        await queryRunner.query(`DROP INDEX "IDX_84faecdb7b72b3cdd554f0204c"`);
        await queryRunner.query(`DROP INDEX "IDX_b7c73c195afc83776fe074bb40"`);
        await queryRunner.query(`DROP INDEX "IDX_a1dbbf59a1391d305172e0a583"`);
        await queryRunner.query(`COMMENT ON COLUMN "persistent_signed_orders"."state" IS NULL`);
        await queryRunner.query(
            `CREATE TYPE "persistent_signed_orders_state_enum_old" AS ENUM('INVALID', 'ADDED', 'FILLED', 'FULLYFILLED', 'CANCELLED', 'EXPIRED', 'UNEXPIRED', 'STOPPEDWATCHING', 'UNFUNDED', 'FILLABILITYINCREASED')`,
        );
        await queryRunner.query(`ALTER TABLE "persistent_signed_orders" ALTER COLUMN "state" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "persistent_signed_orders" ALTER COLUMN "state" TYPE "persistent_signed_orders_state_enum_old" USING "state"::"text"::"persistent_signed_orders_state_enum_old"`,
        );
        await queryRunner.query(`ALTER TABLE "persistent_signed_orders" ALTER COLUMN "state" SET DEFAULT 'ADDED'`);
        await queryRunner.query(`DROP TYPE "persistent_signed_orders_state_enum"`);
        await queryRunner.query(
            `ALTER TYPE "persistent_signed_orders_state_enum_old" RENAME TO  "persistent_signed_orders_state_enum"`,
        );
        await queryRunner.query(`DROP INDEX "IDX_1d7ff682d2e12e7a7ddc0c83f0"`);
        await queryRunner.query(`DROP INDEX "IDX_d90a05126f2d3ce3bb87795abb"`);
        await queryRunner.query(`DROP INDEX "IDX_7648bdf4a96ddc5cc7cfbc0135"`);
        await queryRunner.query(`DROP INDEX "IDX_d611fdbc7da0effe48c103ac77"`);
        await queryRunner.query(`DROP INDEX "IDX_3bd8111c0502847f405082b582"`);
        await queryRunner.query(`DROP TABLE "persistent_signed_orders_v4"`);
        await queryRunner.query(`DROP TYPE "persistent_signed_orders_v4_state_enum"`);
        await queryRunner.query(`DROP INDEX "IDX_09103afc9d57f4ef5a99d4159c"`);
        await queryRunner.query(`DROP INDEX "IDX_f77a0ddf2b4f9aaf9658ef6fe9"`);
        await queryRunner.query(`DROP INDEX "IDX_26555576da615837180cb1c38a"`);
        await queryRunner.query(`DROP INDEX "IDX_54df2445e48dc18c0b2a527c09"`);
        await queryRunner.query(`DROP INDEX "IDX_76bc9b369586c456c859954985"`);
        await queryRunner.query(`DROP TABLE "signed_orders_v4"`);
        await queryRunner.query(
            `CREATE INDEX "persistent_signed_orders_fee_recipient_address" ON "persistent_signed_orders" ("fee_recipient_address") `,
        );
        await queryRunner.query(
            `CREATE INDEX "persistent_signed_orders_taker_asset_data" ON "persistent_signed_orders" ("taker_asset_data") `,
        );
        await queryRunner.query(
            `CREATE INDEX "persistent_signed_orders_maker_asset_data" ON "persistent_signed_orders" ("maker_asset_data") `,
        );
        await queryRunner.query(
            `CREATE INDEX "persistent_signed_orders_maker_address" ON "persistent_signed_orders" ("maker_address") `,
        );
        await queryRunner.query(
            `CREATE INDEX "maker_taker_asset_data_idx" ON "signed_orders" ("maker_asset_data", "taker_asset_data") `,
        );
        await queryRunner.query(`CREATE INDEX "maker_asset_data_idx" ON "signed_orders" ("maker_asset_data") `);
        await queryRunner.query(`CREATE INDEX "taker_asset_data_idx" ON "signed_orders" ("taker_asset_data") `);
        await queryRunner.query(`CREATE INDEX "maker_address_idx" ON "signed_orders" ("maker_address") `);
    }
}
