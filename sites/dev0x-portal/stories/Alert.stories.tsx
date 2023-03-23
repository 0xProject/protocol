import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from '../app/components/Alert';

const meta: Meta<typeof Alert> = {
    title: 'Components/Alert',
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

export const SuccessAlert: Story = {
    args: {
        variant: 'success',
        children: 'This is an Success alert',
    },
};

export const SuccessAlertSmall: Story = {
    args: {
        variant: 'success',
        children: 'This is an Success alert',
        className: 'w-[450px]',
    },
};
