import { BigNumber } from '@0x/utils';
import { MigrationInterface, QueryRunner, Raw } from 'typeorm';

import { RfqmV2JobEntity, RfqmV2QuoteEntity } from '../src/entities';

const INCIDENT_START_TIME = 'June 18, 2022, 12:30 AM';
const INCIDENT_END_TIME = 'June 18, 2022, 3:00 AM';

const TOKEN_PRICES = new Map<string, BigNumber>([
    ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', new BigNumber('0.0000000000000011')], // WETH on Ethereum mainnet
    ['0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', new BigNumber('0.0000000000000000004')], // WMATIC on Polygon
    ['0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', new BigNumber('0.0000000000000011')], // WETH on Polygon
    ['0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', new BigNumber('0.00021')], // WBTC on Polygon
]);

/**
 * Correct token prices in job/quote entities' fee objects: if the recorded price of feeToken/makerToken/takerToken
 * is crazy (more than twice or less than half of the estimated price), update it to the estimated price.
 *
 * @param jobOrQuoteEntity JobEntity or QuoteEntity to be corrected
 * @returns Entity with corrected WETH price
 */
const correctWethPrice = (jobOrQuoteEntity: { fee: any; order: any }): { fee: any; order: any } => {
    const correctedEntity = { ...jobOrQuoteEntity };
    const feeToken = jobOrQuoteEntity.fee.token.toLowerCase();
    const makerToken = jobOrQuoteEntity.order.order.makerToken.toLowerCase();
    const takerToken = jobOrQuoteEntity.order.order.takerToken.toLowerCase();
    if (jobOrQuoteEntity.fee.details.feeTokenBaseUnitPriceUsd && TOKEN_PRICES.has(feeToken)) {
        const price = new BigNumber(jobOrQuoteEntity.fee.details.feeTokenBaseUnitPriceUsd);
        const expectedPrice = TOKEN_PRICES.get(feeToken)!;
        if (price.gt(expectedPrice.times(2)) || price.lt(expectedPrice.div(2))) {
            correctedEntity.fee.details.feeTokenBaseUnitPriceUsd = expectedPrice.toString();
        }
    }
    if (jobOrQuoteEntity.fee.details.makerTokenBaseUnitPriceUsd && TOKEN_PRICES.has(makerToken)) {
        const price = new BigNumber(jobOrQuoteEntity.fee.details.makerTokenBaseUnitPriceUsd);
        const expectedPrice = TOKEN_PRICES.get(makerToken)!;
        if (price.gt(expectedPrice.times(2)) || price.lt(expectedPrice.div(2))) {
            correctedEntity.fee.details.makerTokenBaseUnitPriceUsd = expectedPrice.toString();
        }
    }
    if (jobOrQuoteEntity.fee.details.takerTokenBaseUnitPriceUsd && TOKEN_PRICES.has(takerToken)) {
        const price = new BigNumber(jobOrQuoteEntity.fee.details.takerTokenBaseUnitPriceUsd);
        const expectedPrice = TOKEN_PRICES.get(takerToken)!;
        if (price.gt(expectedPrice.times(2)) || price.lt(expectedPrice.div(2))) {
            correctedEntity.fee.details.takerTokenBaseUnitPriceUsd = expectedPrice.toString();
        }
    }
    return correctedEntity;
};

/**
 * Fix incorrect token prices in rfqm_v2_quotes and rfqm_v2_jobs tables.
 *
 * These errors are caused by an defined.fi incident from `June 18, 2022, 12:38 AM` to `June 18, 2022, 2:36 AM`.
 * See post mortem: https://0xproject.quip.com/GfztAbktm9zD/2022-06-17-RFQM-was-down-intermittently
 */
export class FixIncorrectTokenPrices1655936635158 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const jobs = await queryRunner.connection.getRepository(RfqmV2JobEntity).findBy({
            createdAt: Raw((alias) => `${alias} > :startTime and ${alias} < :endTime`, {
                startTime: INCIDENT_START_TIME,
                endTime: INCIDENT_END_TIME,
            }),
        });

        await queryRunner.connection.getRepository(RfqmV2JobEntity).save(jobs.map(correctWethPrice));

        const quotes = await queryRunner.connection.getRepository(RfqmV2QuoteEntity).findBy({
            createdAt: Raw((alias) => `${alias} > :startTime and ${alias} < :endTime`, {
                startTime: INCIDENT_START_TIME,
                endTime: INCIDENT_END_TIME,
            }),
        });

        await queryRunner.connection.getRepository(RfqmV2QuoteEntity).save(quotes.map(correctWethPrice));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // a no-op since we have no way to tell which entries has incorrect token prices before this migration
    }
}
