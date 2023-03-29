import type { Meta, StoryObj } from '@storybook/react';
import { BackButton } from '../app/components/BackButton';

const meta: Meta<typeof BackButton> = {
    title: 'Components/BackButton',
    component: BackButton,
    tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof BackButton>;

export const Default: Story = {};
