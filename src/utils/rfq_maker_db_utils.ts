import { Connection } from 'typeorm';

import { RfqMakerPairs, RfqMakerPairsUpdateTimeHash } from '../entities';

/**
 * RfqMakerDbUtils provides tools for maker services to interact with the database
 */
export class RfqMakerDbUtils {
    constructor(private readonly _connection: Connection) {}

    /**
     * [RFQ maker] find RfqMakerPairs for given maker and blockchain
     */
    public async getPairsAsync(makerId: string, chainId: number): Promise<RfqMakerPairs | undefined> {
        return this._connection.getRepository(RfqMakerPairs).findOne({
            where: { makerId, chainId },
        });
    }

    /**
     * [RFQ maker] find all RfqMakerPairs for given blockchain
     */
    public async getPairsArrayAsync(chainId: number): Promise<RfqMakerPairs[]> {
        return this._connection.getRepository(RfqMakerPairs).find({
            where: { chainId },
        });
    }

    /**
     * [RFQ maker] find a hash for all pairs update time
     */
    public async getPairsArrayUpdateTimeHashAsync(chainId: number): Promise<string | null> {
        const rfqMakerPairsUpdateTimeHash = await this._connection.getRepository(RfqMakerPairsUpdateTimeHash).findOne({
            where: { chainId },
        });

        return rfqMakerPairsUpdateTimeHash ? rfqMakerPairsUpdateTimeHash.hash : null;
    }

    /**
     * [RFQ maker] create or update RfqMakerPairs for given maker and blockchain
     */
    public async createOrUpdatePairsAsync(
        makerId: string,
        chainId: number,
        pairs: [string, string][],
    ): Promise<RfqMakerPairs> {
        const rfqMakerPairs = new RfqMakerPairs({
            makerId,
            chainId,
            updatedAt: new Date(),
            pairs,
        });
        await this._connection.getRepository(RfqMakerPairs).save(rfqMakerPairs);
        await this._connection.query(`REFRESH MATERIALIZED VIEW rfq_maker_pairs_update_time_hashes`);
        return rfqMakerPairs;
    }
}
