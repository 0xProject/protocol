import { Badge } from '../app/components/Badge';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
    title: 'Components/Badge',
    component: Badge,
    tags: ['autodocs'],
    args: {
        className: '',
        children: 'Default badge',
    },
    argTypes: {
        children: {
            name: 'text',
        },
        roundness: {
            description: 'How rounded the badge should be?',
            options: ['default', 'xl'],
            control: { type: 'radio' },
        },

        color: {
            description: 'What color to use?',
            options: ['green', 'blue', 'brown', 'purple', 'yellow', 'grey'],
            control: { type: 'radio' },
        },
    },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
    args: {},
};

export const RoundnessXl: Story = {
    args: {
        color: 'grey',
        children: 'Beta',
        roundness: 'xl',
    },
};
export const Green: Story = {
    args: {
        color: 'green',
        children: 'Swap Api',
    },
};
export const Blue: Story = {
    args: {
        color: 'blue',
        children: 'Orderbook',
    },
};
export const Brown: Story = {
    args: { color: 'brown', children: 'Token Registry' },
};
export const Purple: Story = {
    args: { color: 'purple', children: 'Tx History' },
};
export const Yellow: Story = {
    args: {
        color: 'yellow',
        children: 'Tx Relay',
    },
};
