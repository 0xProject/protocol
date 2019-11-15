import { Connection } from 'typeorm';

export class StakingService {
    private readonly _connection: Connection;
    constructor(connection: Connection) {
        this._connection = connection;
    }
    public async getStakingPoolsAsync(): Promise<any> {
        return this._connection;
    }
}
