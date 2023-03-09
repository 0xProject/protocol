import { BackgroundJobMBCEvictData, BackgroundJobMBCEvictResult } from './maker_balance_cache_evict';
import { BackgroundJobMBCUpdateData, BackgroundJobMBCUpdateResult } from './maker_balance_cache_update';
import { BackgroundJobNoOpData, BackgroundJobNoOpResult } from './no_op';

export type BackgroundJobData =
    | BackgroundJobNoOpData
    | BackgroundJobMBCEvictData
    | BackgroundJobMBCUpdateData /* | OtherBackgroundJobData */;
export type BackgroundJobResult =
    | BackgroundJobNoOpResult
    | BackgroundJobMBCEvictResult
    | BackgroundJobMBCUpdateResult /* | OtherBackgroundJobResult */;
