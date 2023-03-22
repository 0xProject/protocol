import type { Meta, StoryObj } from '@storybook/react';
import { FieldSet } from '../app/components/FieldSet';
import { MultiSelectCard } from '../app/components/MultiselectCard';
import { Swap } from '../app/icons/Swap';

const meta: Meta<typeof FieldSet> = {
    title: 'Base/FieldSet',
    component: FieldSet,
    tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FieldSet>;

export const Default: Story = {
    args: {
        label: 'Example FieldSet',
        children: [
            <MultiSelectCard
                title="Swap API"
                description="Access efficient liquidity for powering token swaps"
                icon={<Swap />}
                id="swap-api"
                selected={false}
                key="swap-api"
            />,
        ],
    },
};
