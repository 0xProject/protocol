import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../app/components/Badge';
import { MultiSelectCard } from '../app/components/MultiselectCard';
import { Swap } from '../app/icons/Swap';

const meta: Meta<typeof MultiSelectCard> = {
    title: 'Base/MultiselectCard',
    component: MultiSelectCard,
    tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof MultiSelectCard>;

export const Default: Story = {
    args: {
        title: 'Swap API',
        description: 'Access efficient liquidity for powering token swaps ',
        icon: <Swap />,
        id: 'swap-api',
        selected: false,
    },
};

export const Selected: Story = {
    args: {
        title: 'Swap API',
        description: 'Access efficient liquidity for powering token swaps ',
        icon: <Swap />,
        id: 'swap-api-selected',
        selected: true,
    },
};

export const WithDecorator: Story = {
    args: {
        title: 'Swap API',
        description: 'Access efficient liquidity for powering token swaps ',
        icon: <Swap />,
        id: 'swap-api-decorator',
        labelDecorator: (
            <Badge color="blue" className="px-2 py-0 text-sm" roundness="xl">
                Beta
            </Badge>
        ),
        selected: false,
    },
};
