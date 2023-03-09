import { DataSource } from 'typeorm';

import { createConfig } from './createOrmConfig';

// tslint:disable-next-line: no-default-export
export default new DataSource(createConfig());
