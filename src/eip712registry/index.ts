import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { createExchangeProxyEIP712Domain } from '@0x/protocol-utils';

import { Eip712Domain } from '../core/types';

import * as ethereum from './ethereum.json';
import * as polygon from './polygon.json';

export const EIP_712_REGISTRY: Record<
    number,
    Record<string, { kind: string; domain: Eip712Domain; domainSeparator: string }>
> = {
    1: ethereum,
    137: polygon,
};

export const getZeroExEip712Domain = (chainId: number) =>
    createExchangeProxyEIP712Domain(chainId, getContractAddressesForChainOrThrow(chainId).exchangeProxy);
