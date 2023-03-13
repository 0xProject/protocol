import { Button } from '../app/components/Button';
import * as ConfirmDialog from '../app/components/ConfirmDialog';

import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentPropsWithoutRef } from 'react';

const ConfirmDialogExample = ({ children, ...other }: ComponentPropsWithoutRef<typeof ConfirmDialog.Content>) => {
    return (
        <ConfirmDialog.Root>
            <ConfirmDialog.Trigger asChild>
                <Button>Open</Button>
            </ConfirmDialog.Trigger>
            <ConfirmDialog.Content {...other} className="w-[450px]">
                <p className="font-sans text-base">{children}</p>
            </ConfirmDialog.Content>
        </ConfirmDialog.Root>
    );
};

const meta = {
    title: 'Components/ConfirmDialog',
    component: ConfirmDialogExample,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            description: 'The type of the ConfirmDialog',
            options: ConfirmDialog.variants,
            control: { type: 'radio' },
        },
        cancelButtonText: {
            name: 'Cancel button text',
            type: 'string',
        },
        confirmButtonText: {
            name: 'Confirm button text',
            type: 'string',
        },
        children: {
            name: 'Text content',
        },
    },
} satisfies Meta<typeof ConfirmDialogExample>;

export default meta;
type Story = StoryObj<typeof ConfirmDialogExample>;

export const Default: Story = {
    args: {
        title: "That's a title for confirm dialog.",
        children:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent at rutrum libero. Duis pharetra, dolor vel dignissim facilisis, ante urna congue magna.',
    },
};
export const Alert: Story = {
    args: {
        title: 'Are you sure to remove these services?',
        cancelButtonText: 'Cancel',
        confirmButtonText: 'Yes, I want to remove services',
        children:
            'Removing products from your API key can break your app, and prevent it from making API calls. Type Coinbase Wallet to confirm this action.',
        variant: 'alert',
    },
};
