import { AppsTable } from '../app/components/AppsTable';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
    title: 'Components/AppsTable',
    component: AppsTable,
    tags: ['autodocs'],
    args: {
        data: [
            {
                name: 'Demo app',
                brandColor: '#01A74D',
                metrics: {
                    requests: 122,
                    volume: 3422,
                    users: 30,
                },
                encodedUrlPathname: 'demo-app',
                onChainTag: [],
            },
            {
                name: 'Coinbase wallet',
                brandColor: '#3A65EB',
                metrics: {
                    requests: 3224,
                    volume: 54232,
                    users: 45,
                },
                encodedUrlPathname: 'coinbase-wallet',
                onChainTag: [],
            },
        ],
    },
} satisfies Meta<typeof AppsTable>;

export default meta;
type Story = StoryObj<typeof AppsTable>;

export const Default: Story = {
    args: {},
};
