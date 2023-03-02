import type { Meta, StoryObj } from '@storybook/react';
import { BinaryLinkButton } from '../app/components/BinaryLinkButton';

const meta: Meta<typeof BinaryLinkButton> = {
    title: 'BinaryLinkButton',
    component: BinaryLinkButton,
    tags: ['autodocs'],
    args: {
        active: 'left',
        states: {
            left: {
                label: 'Left',
                url: '#',
            },
            right: {
                label: 'Right',
                url: '#',
            },
        },
        render: undefined,
    },
};

export default meta;

type Story = StoryObj<typeof BinaryLinkButton>;

export const Normal: Story = {
    args: {
        active: 'left',
        states: {
            left: {
                label: 'Left',
                url: '#',
            },
            right: {
                label: 'Right',
                url: '#',
            },
        },
        render(sideProps) {
            return <span {...sideProps}>{sideProps.label}</span>;
        },
    },
};
