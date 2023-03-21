import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import Client from 'mailgun.js/client';
import mailgunClient from '../../mailgun';

jest.mock('../../mailgun', () => ({
    __esModule: true,
    default: mockDeep<Client>(),
}));

export const mailgunMock = mailgunClient as unknown as DeepMockProxy<Client>;
