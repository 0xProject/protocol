import { assert } from '@0x/assert';
import { BigNumber } from '@0x/utils';
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { META_TXN_RELAY_EXPECTED_MINED_SEC } from '../config';
import { ONE_SECOND_MS, ZERO } from '../constants';
import { TransactionStates } from '../types';

import { BigIntTransformer, BigNumberTransformer } from './transformers';
import { TransactionEntityOpts } from './types';

@Entity({ name: 'transactions' })
export class TransactionEntity {
    @PrimaryColumn({ name: 'ref_hash', type: 'varchar' })
    // reference hash can be either be the zeroExTransaction hash or the actual
    // txHash depending on whether we are submitting a meta-transaction or an
    // unsticking ethereum transaction.
    public refHash: string;

    @Column({ name: 'data', type: 'varchar', nullable: true })
    public data?: string;

    @Column({ name: 'to', type: 'varchar' })
    public to?: string;

    @Column({ name: 'tx_hash', type: 'varchar', unique: true, nullable: true })
    public txHash?: string;

    @Column({ name: 'status', type: 'varchar' })
    public status: string;

    @Column({ name: 'taker_address', type: 'varchar', nullable: true })
    public takerAddress?: string;

    @Column({ name: 'expected_mined_in_sec', type: 'int' })
    public expectedMinedInSec?: number;

    @Column({ name: 'gas_price', type: 'bigint', nullable: true, transformer: BigNumberTransformer })
    public gasPrice?: BigNumber;

    @Column({ name: 'value', type: 'bigint', nullable: true, transformer: BigNumberTransformer })
    public value?: BigNumber;

    @Column({ name: 'gas', type: 'int', nullable: true })
    public gas?: number | null;

    @Column({ name: 'from', type: 'varchar', nullable: true })
    public from?: string;

    @Column({ name: 'nonce', type: 'bigint', nullable: true, transformer: BigIntTransformer })
    public nonce?: number;

    @Column({ name: 'gas_used', type: 'int', nullable: true })
    public gasUsed?: number | null;

    @Column({ name: 'block_number', type: 'bigint', nullable: true, transformer: BigIntTransformer })
    public blockNumber?: number;

    @Column({ name: 'tx_status', type: 'int', nullable: true })
    public txStatus?: number | null;

    @Column({ name: 'api_key', type: 'varchar', nullable: true })
    public apiKey?: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    public createdAt?: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    public updatedAt?: Date;

    @Column({ name: 'expected_at', type: 'timestamptz' })
    public expectedAt: Date;

    public static make(opts: TransactionEntityOpts): TransactionEntity {
        assert.isHexString('refHash', opts.refHash);
        if (opts.txHash !== undefined) {
            assert.isHexString('txHash', opts.txHash);
        }
        if (opts.from !== undefined) {
            assert.isETHAddressHex('from', opts.from);
        }
        assert.doesBelongToStringEnum('status', opts.status, TransactionStates);
        if (opts.nonce !== undefined && !Number.isInteger(opts.nonce) && opts.nonce <= 0) {
            throw new Error(`Expected nonce to be a positive integer, encountered: ${opts.nonce}`);
        }
        if (opts.blockNumber !== undefined && !Number.isInteger(opts.blockNumber) && opts.blockNumber <= 0) {
            throw new Error(`Expected blockNumber to be a positive integer, encountered: ${opts.blockNumber}`);
        }
        return new TransactionEntity(opts);
    }

    // HACK(oskar) we want all fields to be set and valid, otherwise we should
    // not accept a transaction entity, however because of this issue:
    // https://github.com/typeorm/typeorm/issues/1772 we cannot accept undefined
    // as an argument to the constructor, to not break migrations with
    // serialize. Please use the public static make method instead.
    private constructor(
        opts: TransactionEntityOpts = {
            refHash: '',
            txHash: '',
            to: '',
            data: '',
            apiKey: '',
            takerAddress: '',
            status: '',
            expectedMinedInSec: META_TXN_RELAY_EXPECTED_MINED_SEC,
            nonce: 0,
            gasPrice: ZERO,
            value: ZERO,
            from: '',
            gas: null,
            gasUsed: null,
            txStatus: null,
        },
    ) {
        this.refHash = opts.refHash;
        this.txHash = opts.txHash;
        this.takerAddress = opts.takerAddress;
        this.to = opts.to;
        this.data = opts.data;
        this.apiKey = opts.apiKey;
        this.status = opts.status;
        this.expectedMinedInSec = opts.expectedMinedInSec;
        this.nonce = opts.nonce;
        this.gasPrice = opts.gasPrice;
        this.value = opts.value;
        this.blockNumber = opts.blockNumber;
        this.from = opts.from;
        this.gas = opts.gas;
        this.gasUsed = opts.gasUsed;
        this.txStatus = opts.txStatus;
        const now = new Date();
        this.expectedAt = new Date(now.getTime() + this.expectedMinedInSec * ONE_SECOND_MS);
    }
}
