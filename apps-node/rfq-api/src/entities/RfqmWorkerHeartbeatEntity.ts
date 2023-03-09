import { BigNumber } from '@0x/utils';
import { Column, Entity, PrimaryColumn } from 'typeorm';

import { BigNumberTransformer } from './transformers';

export type RfqmWorkerHeartbeatOptions = Pick<RfqmWorkerHeartbeatEntity, 'address' | 'balance' | 'index' | 'chainId'> &
    Partial<RfqmWorkerHeartbeatEntity>;

@Entity({ name: 'rfqm_worker_heartbeats' })
export class RfqmWorkerHeartbeatEntity {
    // The blockchain address of the worker
    @PrimaryColumn({ name: 'address', type: 'varchar' })
    public address: string;

    // The time the report was created
    @Column({ name: 'timestamp', type: 'timestamptz', default: () => 'now()' })
    public timestamp!: Date;

    // The native token balance of the worker
    @Column({ name: 'balance', type: 'numeric', transformer: BigNumberTransformer })
    public balance: BigNumber;

    // The worker index assigned to the worker's ENV by Kubernetes
    @Column({ name: 'index', type: 'int' })
    public index: number;

    // The chain ID of the chain the worker is active on.
    @PrimaryColumn({ name: 'chain_id', type: 'int' })
    public chainId: number;

    // TypeORM runs a validation check where it calls this initializer with no argument.
    // With no default `opts`, `opts` will be undefined and the validation will throw,
    // therefore, add this hacky default.
    // tslint:disable-next-line no-object-literal-type-assertion
    constructor(opts: RfqmWorkerHeartbeatOptions = {} as RfqmWorkerHeartbeatOptions) {
        if (opts.timestamp) {
            this.timestamp = opts.timestamp;
        }
        this.address = opts.address;
        this.balance = opts.balance;
        this.chainId = opts.chainId;
        this.index = opts.index;
    }
}
