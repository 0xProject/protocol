import type { Meta, StoryObj } from '@storybook/react';
import { HiddenText } from '../app/components/HiddenText';

const meta = {
    title: 'Components/HiddenText',
    component: HiddenText,
    tags: ['autodocs'],
} satisfies Meta<typeof HiddenText>;

export default meta;
type Story = StoryObj<typeof HiddenText>;

export const Default: Story = {
    args: {
        children: 'Text',
        width: 200,
    },
};
