import type { Meta, StoryObj } from '@storybook/react';
import { IconButton } from '../app/components/IconButton';
import { Bars } from '../app/icons/Bars';

const meta = {
    title: 'Components/IconButton',
    component: IconButton,
    tags: ['autodocs'],
    args: {
        className: '',
        children: <Bars />,
    },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
    args: {
        children: <Bars color="#fff" />,
    },
};
export const Grey: Story = {
    args: {
        children: <Bars color="black" />,
        color: 'grey',
    },
};
export const Rounded: Story = {
    args: {
        children: <Bars />,
        color: 'grey',
        roundness: 'lg',
    },
};
export const Transparent: Story = {
    args: {
        children: <Bars />,
        color: 'transparent',
    },
};
