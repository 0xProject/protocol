import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from '../app/components/Alert';

const meta: Meta<typeof Alert> = {
    title: 'Alert',
    component: Alert,
    tags: ['autodocs'],
    args: {
        variant: 'error',
        children: 'This is an alert',
    },
    argTypes: {
        variant: {
            description: 'Describes the type of the alert',
        },
        children: {
            description: 'The content of the alert',
        },
    },
};

export default meta;

type Story = StoryObj<typeof Alert>;

export const ErrorAlert: Story = {
    args: {
        variant: 'error',
        children: 'This is an error alert',
    },
};

export const ErrorAlertSmall: Story = {
    args: {
        variant: 'error',
        children: 'This is an error alert',
        className: 'w-[450px]',
    },
};
