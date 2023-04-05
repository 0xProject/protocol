import { DataSource } from 'typeorm';

import { createConfig } from './createOrmConfig';

export default new DataSource(createConfig());
