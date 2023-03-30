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
