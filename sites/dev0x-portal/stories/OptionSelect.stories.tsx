import type { Meta, StoryObj } from '@storybook/react';
import OptionSelect from '../app/components/OptionSelect';

const meta: Meta<typeof OptionSelect> = {
    title: 'Components/OptionSelect',
    component: OptionSelect,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof OptionSelect>;

export const Default: Story = {
    args: {
        placeholder: 'Select an option',
        className: 'w-[256px]',
        options: [
            { value: '1', label: 'Option 1' },
            { value: '2', label: 'Option 2' },
            { value: '3', label: 'Option 3' },
        ],
    },
};

export const WithLabel: Story = {
    args: {
        placeholder: 'Select an option',
        className: 'w-[256px]',
        label: 'Label',
        options: [
            { value: '1', label: 'Option 1' },
            { value: '2', label: 'Option 2' },
            { value: '3', label: 'Option 3' },
        ],
    },
};

export const WithHiddenLabel: Story = {
    args: {
        placeholder: 'Select an option',
        className: 'w-[256px]',
        label: 'Label',
        hiddenLabel: true,
        options: [
            { value: '1', label: 'Option 1' },
            { value: '2', label: 'Option 2' },
            { value: '3', label: 'Option 3' },
        ],
    },
};

export const WithError: Story = {
    args: {
        placeholder: 'Select an option',
        className: 'w-[256px]',
        error: 'This is an error',
        options: [
            { value: '1', label: 'Option 1' },
            { value: '2', label: 'Option 2' },
            { value: '3', label: 'Option 3' },
        ],
    },
};

export const WithErrorAndLabel: Story = {
    args: {
        placeholder: 'Select an option',
        className: 'w-[256px]',
        error: 'This field is required',
        label: 'Please select an option',
        options: [
            { value: '1', label: 'Option 1' },
            { value: '2', label: 'Option 2' },
            { value: '3', label: 'Option 3' },
        ],
    },
};
