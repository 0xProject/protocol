import type { Meta, StoryObj } from '@storybook/react';
import { BlurredInputWithCopy } from '../app/components/BlurredInputWithCopy';

const meta: Meta<typeof BlurredInputWithCopy> = {
    title: 'Components/BlurredInputWithCopy',
    component: BlurredInputWithCopy,
    tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof BlurredInputWithCopy>;

export const Default: Story = {
    args: {
        value: '1337-420-69-r4nd0m',
        label: 'Secret',
    },
};

export const DefaultShow: Story = {
    args: {
        value: '1337-420-69-r4nd0m',
        label: 'Secret',
        initialShow: true,
    },
};
export const HiddenLabel: Story = {
    args: {
        value: '1337-420-69-r4nd0m',
        label: 'Secret',
        hiddenLabel: true,
    },
};
