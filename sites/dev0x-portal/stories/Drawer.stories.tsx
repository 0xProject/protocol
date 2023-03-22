import { Button } from '../app/components/Button';
import * as Drawer from '../app/components/Drawer';

import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentPropsWithoutRef } from 'react';

const DrawerExample = ({ children, ...other }: ComponentPropsWithoutRef<typeof Drawer.Content>) => {
    return (
        <Drawer.Root>
            <Drawer.Trigger asChild>
                <Button>Open</Button>
            </Drawer.Trigger>
            <Drawer.Content {...other}>
                <div className="font-sans text-base p-6">{children}</div>
            </Drawer.Content>
        </Drawer.Root>
    );
};

const meta = {
    title: 'Components/Drawer',
    component: DrawerExample,
    tags: ['autodocs'],
    args: {
        children:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent at rutrum libero. Duis pharetra, dolor vel dignissim facilisis, ante urna congue magna.',
    },
    argTypes: {
        position: {
            description: 'Position of the Drawer',
            options: Drawer.positions,
            control: { type: 'radio' },
        },
        children: {
            name: 'Text content',
        },
    },
} satisfies Meta<typeof DrawerExample>;

export default meta;
type Story = StoryObj<typeof DrawerExample>;

export const Default: Story = {
    args: {},
};
export const Bottom: Story = {
    args: {
        position: 'bottom',
    },
};
export const Left: Story = {
    args: {
        position: 'left',
    },
};
export const Top: Story = {
    args: {
        position: 'top',
    },
};
