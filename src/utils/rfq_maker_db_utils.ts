import { Connection } from 'typeorm';

import { RfqMaker, RfqMakerUpdateTimeHash } from '../entities';

/**
 * RfqMakerDbUtils provides tools for maker services to interact with the database
 */
export class RfqMakerDbUtils {
    constructor(private readonly _connection: Connection) {}

    /**
     * [RFQ maker] find RfqMaker for given maker and blockchain
     */
    public async getRfqMakerAsync(makerId: string, chainId: number): Promise<RfqMaker | undefined> {
        return this._connection.getRepository(RfqMaker).findOne({
            where: { makerId, chainId },
        });
    }

    /**
     * [RFQ maker] find all RfqMaker for given blockchain
     */
    public async getRfqMakersAsync(chainId: number): Promise<RfqMaker[]> {
        return this._connection.getRepository(RfqMaker).find({
            where: { chainId },
        });
    }

    /**
     * [RFQ maker] find a hash for all RfqMaker update time
     */
    public async getRfqMakersUpdateTimeHashAsync(chainId: number): Promise<string | null> {
        const rfqMakerUpdateTimeHash = await this._connection.getRepository(RfqMakerUpdateTimeHash).findOne({
            where: { chainId },
        });

        return rfqMakerUpdateTimeHash ? rfqMakerUpdateTimeHash.hash : null;
    }

    /**
     * [RFQ maker] create or update RfqMaker for given maker and blockchain
     */
    public async createOrUpdateRfqMakerAsync(
        makerId: string,
        chainId: number,
        pairs: [string, string][],
        rfqtUri: string | null,
        rfqmUri: string | null,
    ): Promise<RfqMaker> {
        const rfqMaker = new RfqMaker({
            makerId,
            chainId,
            updatedAt: new Date(),
            pairs,
            rfqtUri,
            rfqmUri,
        });
        await this._connection.getRepository(RfqMaker).save(rfqMaker);
        await this._connection.query(`REFRESH MATERIALIZED VIEW rfq_maker_pairs_update_time_hashes`);
        return rfqMaker;
    }
}
