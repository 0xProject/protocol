import * as kong from '../../gateway/kongGateway';

jest.mock('../../gateway/kongGateway');

export const kongMock = jest.mocked(kong);
