import * as gateway from '../../gateway';

jest.mock('../../gateway');

export const gatewayMock = jest.mocked(gateway);
