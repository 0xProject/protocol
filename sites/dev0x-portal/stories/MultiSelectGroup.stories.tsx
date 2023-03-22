import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../app/components/Badge';
import { MultiSelectCard } from '../app/components/MultiselectCard';
import { MultiSelectGroup } from '../app/components/MultiSelectGroup';
import { Book } from '../app/icons/Book';
import { Database } from '../app/icons/Database';
import { Flash } from '../app/icons/Flash';
import { FastBackward } from '../app/icons/FastBackward';
import { Swap } from '../app/icons/Swap';

const meta: Meta<typeof MultiSelectGroup> = {
    title: 'Components/MultiSelectGroup',
    component: MultiSelectGroup,
    tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof MultiSelectGroup>;

export const Default: Story = {
    args: {
        label: 'What 0x products should be enabled?',
        children: [
            <MultiSelectCard
                title="Swap API"
                description="Access efficient liquidity for powering token swaps"
                icon={<Swap />}
                id="swap-api"
                selected={true}
                key="swap-api"
            />,
            <MultiSelectCard
                title="Orderbook API"
                description="Power limit orders in your application"
                icon={<Book />}
                id="orderbook-api"
                selected={true}
                key="orderbook-api"
            />,
            <MultiSelectCard
                title="Token Registry"
                description="Access the 0x curated token list"
                icon={<Database />}
                id="token-registry"
                labelDecorator={
                    <Badge color="blue" className="px-2 py-0 text-sm" roundness="xl">
                        Beta
                    </Badge>
                }
                selected={true}
                key="token-registry"
            />,
            <MultiSelectCard
                title="Tx History"
                description="Get transaction history for 0x transactions"
                icon={<FastBackward />}
                id="transaction-history"
                labelDecorator={
                    <Badge color="blue" className="px-2 py-0 text-sm" roundness="xl">
                        Beta
                    </Badge>
                }
                selected={true}
                key="transaction-history"
            />,
            <MultiSelectCard
                title="Tx Relay"
                description="Power seamless UX with gasless trades"
                icon={<Flash />}
                id="tx-relay"
                selected={true}
                key="tx-relay"
            />,
        ],
    },
};
