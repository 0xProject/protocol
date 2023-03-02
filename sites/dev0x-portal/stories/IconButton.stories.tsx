import type { Meta, StoryObj } from '@storybook/react';
import { IconButton } from '../app/components/IconButton';
import { HamburgerIcon } from '../app/icons/Hamburger';

const meta = {
    title: 'Components/IconButton',
    component: IconButton,
    tags: ['autodocs'],
    args: {
        className: '',
        children: <HamburgerIcon />,
    },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
    args: {
        children: <HamburgerIcon color="#fff" />,
    },
};
export const Grey: Story = {
    args: {
        children: <HamburgerIcon color="black" />,
        color: 'grey',
    },
};
export const Rounded: Story = {
    args: {
        children: <HamburgerIcon />,
        color: 'grey',
        roundness: 'lg',
    },
};
export const Transparent: Story = {
    args: {
        children: <HamburgerIcon />,
        color: 'transparent',
    },
};
