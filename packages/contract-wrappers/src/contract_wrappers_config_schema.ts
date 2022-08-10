export const ContractWrappersConfigSchema = {
    id: '/ContractWrappersConfig',
    properties: {
        chainId: {
            type: 'number',
        },
        gasPrice: { $ref: '/numberSchema' },
        contractAddresses: {
            type: 'object',
            properties: {
                zrxToken: { $ref: '/addressSchema' },
                etherToken: { $ref: '/addressSchema' },
                staking: { $ref: '/addressSchema' },
            },
        },
        blockPollingIntervalMs: { type: 'number' },
    },
    type: 'object',
    required: ['chainId'],
};
