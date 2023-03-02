import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../app/components/Button';

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
    title: 'Components/Button',
    component: Button,
    tags: ['autodocs'],
    args: {
        className: '',
    },
    argTypes: {
        children: {
            defaultValue: 'Button',
            name: 'Text',
        },
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof Button>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
export const Default: Story = {
    args: {
        children: 'Button',
    },
};
export const Grey: Story = {
    args: {
        children: 'Button',
        color: 'grey',
    },
};
export const DefaultDisabled: Story = {
    args: {
        children: 'Button',
        disabled: true,
    },
};

export const Rounded: Story = {
    args: {
        children: 'Button',
        roundness: 'lg',
    },
};

export const FullWidth: Story = {
    args: {
        children: 'Button full width',
        className: 'w-full',
    },
};
