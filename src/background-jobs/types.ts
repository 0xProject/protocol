import { BackgroundJobNoOpData, BackgroundJobNoOpResult } from './no_op';

export type BackgroundJobData = BackgroundJobNoOpData /* | OtherBackgroundJobData */;
export type BackgroundJobResult = BackgroundJobNoOpResult /* | OtherBackgroundJobResult */;
