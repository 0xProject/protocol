import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../app/components/Button';
import { IconButton } from '../app/components/IconButton';
import { TextInput } from '../app/components/TextInput';
import { Eye } from '../app/icons/Eye';

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta: Meta<typeof TextInput> = {
    title: 'Components/Input',
    component: TextInput,
    tags: ['autodocs'],
    args: {
        name: '',
        id: '',
        placeholder: '',
        className: '',
        label: '',
        hiddenLabel: false,
    },
    argTypes: {
        label: {
            description: 'The label for the input',
            defaultValue: undefined,
        },
        hiddenLabel: {
            description:
                'Whether to hide the label. If a label prop is provided, it will be used as the aria-label for the input',
            defaultValue: false,
        },
        error: {
            description: 'The error message to display',
            defaultValue: undefined,
        },
        className: {
            description: 'The class name to apply to the label container',
            defaultValue: undefined,
        },
        inputClassName: {
            description: 'The class name to apply to the input',
            defaultValue: undefined,
        },
        startDecorator: {
            description: 'The element to display before the input',
            options: ['-', 'IconButton', 'TextButton'],
            mapping: {
                '-': undefined,
                IconButton: (
                    <IconButton color="white" className="shadow-md h-11 w-11" size="xs" roundness="sm">
                        <Eye height="100%" width="100%" />
                    </IconButton>
                ),
                TextButton: (
                    <Button className="shadow-md h-11" size="xs">
                        Copy this key{' '}
                    </Button>
                ),
            },
        },
        endDecorator: {
            description: 'The element to display after the input',
            options: ['-', 'IconButton', 'TextButton'],
            mapping: {
                '-': undefined,
                IconButton: (
                    <IconButton color="white" className="shadow-md h-11 w-11" size="xs" roundness="sm">
                        <Eye height="100%" width="100%" />
                    </IconButton>
                ),
                TextButton: (
                    <Button className="shadow-md h-11" size="xs">
                        Copy this key{' '}
                    </Button>
                ),
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
export const NormalInput: Story = {
    args: {
        name: 'email',
        id: 'email',
        className: 'w-[456px]',
    },
};

export const PasswordInput: Story = {
    args: {
        name: 'email',
        id: 'email',
        className: 'w-[456px]',
        type: 'password',
    },
};
export const EmailInput: Story = {
    args: {
        name: 'email',
        id: 'email',
        className: 'w-[456px]',
        type: 'email',
    },
};

export const NormalInputWithLabel: Story = {
    args: {
        name: 'email',
        id: 'email',
        label: "What's your work email address?",
        className: 'w-[456px]',
    },
};

export const NormalInputWithHiddenLabel: Story = {
    args: {
        name: 'email',
        id: 'email',
        label: "What's your work email address?",
        className: 'w-[456px]',
        hiddenLabel: true,
    },
};

export const NormalInputWithPlaceholder: Story = {
    args: {
        name: 'email',
        id: 'email',
        placeholder: 'you@company.com',
        className: 'w-[456px]',
    },
};

export const NormalInputWithError: Story = {
    args: {
        name: 'email',
        id: 'email',
        label: "What's your work email address?",
        className: 'w-[456px]',
        error: 'This field is required.',
        defaultValue: 'Invalid value',
    },
};

export const InputWithIconRight: Story = {
    args: {
        name: 'password',
        id: 'password',
        label: "What's your password?",
        className: 'w-[456px]',
        endDecorator: (
            <IconButton color="white" className="shadow-md h-11 w-11" size="xs" roundness="sm">
                <Eye height="100%" width="100%" />
            </IconButton>
        ),
    },
};

export const InputWithIconRightAndError: Story = {
    args: {
        name: 'password',
        id: 'password',
        label: "What's your password?",
        className: 'w-[456px]',
        error: 'This field is required.',
        endDecorator: (
            <IconButton color="white" className="shadow-md h-11 w-11" size="xs" roundness="sm">
                <Eye height="100%" width="100%" />
            </IconButton>
        ),
    },
};

export const InputWithIconLeft: Story = {
    args: {
        name: 'password',
        id: 'password',
        label: "What's your password?",
        className: 'w-[456px]',
        startDecorator: (
            <IconButton color="white" className="shadow-md h-11 w-11" size="xs" roundness="sm">
                <Eye height="100%" width="100%" />
            </IconButton>
        ),
    },
};

export const InputWithIconLeftAndError: Story = {
    args: {
        name: 'password',
        id: 'password',
        label: "What's your password?",
        className: 'w-[456px]',
        error: 'This field is required.',
        startDecorator: (
            <IconButton color="white" className="shadow-md h-11 w-11" size="xs" roundness="sm">
                <Eye height="100%" width="100%" />
            </IconButton>
        ),
    },
};

export const InputWithLongLeftDecorator: Story = {
    args: {
        name: 'apikey',
        id: 'apikey',
        label: 'API Key',
        className: 'w-[456px]',
        initialValue: '1234567890',
        startDecorator: (
            <Button className="shadow-md h-11" size="xs">
                Copy this key{' '}
            </Button>
        ),
    },
};

export const InputWithLongRightDecorator: Story = {
    args: {
        name: 'apikey',
        id: 'apikey',
        label: 'API Key',
        className: 'w-[456px]',
        initialValue: '1234567890',
        endDecorator: (
            <Button className="shadow-md h-11" size="xs">
                Copy this key{' '}
            </Button>
        ),
    },
};
