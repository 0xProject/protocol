import * as MeshGraphQLClientModule from '@0x/mesh-graphql-client';
import { ImportMock } from 'ts-mock-imports';

import * as MeshClientModule from '../src/utils/mesh_client';

import { getTestDBConnectionAsync } from './utils/db_connection';
import { MeshClient as MeshClientMock } from './utils/mesh_client_mock';

// Mock Mesh to use a dummy client rather than connecting to an actual Mesh instance
const _meshClientMock = new MeshClientMock();

const graphqlClientMockManager = ImportMock.mockClass(MeshGraphQLClientModule, 'MeshGraphQLClient');
const meshClientMockManager = ImportMock.mockClass(MeshClientModule, 'MeshClient');
meshClientMockManager.mock('getStatsAsync').callsFake(_meshClientMock.getStatsAsync.bind(_meshClientMock));
meshClientMockManager.mock('getOrdersV4Async').callsFake(_meshClientMock.getOrdersAsync.bind(_meshClientMock));
meshClientMockManager.mock('addOrdersV4Async').callsFake(_meshClientMock.addOrdersV4Async.bind(_meshClientMock));
meshClientMockManager.mock('onOrderEvents').callsFake(_meshClientMock.onOrderEvents.bind(_meshClientMock));

export const resetState = async () => {
    _meshClientMock._resetClient();
    // Clear DB state
    await getTestDBConnectionAsync();
};

after(() => {
    graphqlClientMockManager.restore();
    meshClientMockManager.restore();
});
