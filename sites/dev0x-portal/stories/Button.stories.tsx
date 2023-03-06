import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../app/components/Button';
import { ChevronDown } from '../app/icons/ChevronDown';
import { Bars } from '../app/icons/Bars';

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
        startIcon: {
            options: ['-', 'ChevronDown', 'Bars'],
            mapping: {
                '-': '',
                ChevronDown: <ChevronDown />,
                Bars: <Bars />,
            },
            control: {
                type: 'select',
            },
        },
        endIcon: {
            options: ['-', 'ChevronDown'],
            mapping: {
                '-': '',
                ChevronDown: <ChevronDown />,
                Bars: <Bars />,
            },
            control: {
                type: 'select',
            },
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

export const StartIcon: Story = {
    args: {
        children: 'Button',
        startIcon: <ChevronDown />,
    },
};

export const EndIcon: Story = {
    args: {
        children: 'Button',
        endIcon: <ChevronDown />,
    },
};
