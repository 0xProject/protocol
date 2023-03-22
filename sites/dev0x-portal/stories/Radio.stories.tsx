import type { Meta, StoryObj } from '@storybook/react';
import { Radio } from '../app/components/Radio';
import * as Checkbox from '@radix-ui/react-checkbox';

const meta: Meta<typeof Radio> = {
    title: 'Base/Radio',
    component: Radio,
    tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Radio>;

export const Unchecked: Story = {};

export const Checked: Story = {
    args: {
        defaultChecked: true,
    },
};

export const Disabled: Story = {
    args: {
        disabled: true,
    },
};

export const DisabledChecked: Story = {
    args: {
        disabled: true,
        defaultChecked: true,
    },
};
