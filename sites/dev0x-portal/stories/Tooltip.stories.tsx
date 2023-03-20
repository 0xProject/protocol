import * as Tooltip from '../app/components/Tooltip';

import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentPropsWithoutRef } from 'react';
import { Copy } from '../app/icons/Copy';

export const TooltipExample = ({
    delayDuration,
    skipDelayDuration,
    disableHoverableContent,
    children,
    ...other
}: ComponentPropsWithoutRef<typeof Tooltip.Content> & ComponentPropsWithoutRef<typeof Tooltip.Provider>) => {
    return (
        <Tooltip.Provider
            delayDuration={delayDuration}
            skipDelayDuration={skipDelayDuration}
            disableHoverableContent={disableHoverableContent}
        >
            <Tooltip.Root>
                <Tooltip.Trigger>Hover</Tooltip.Trigger>
                <Tooltip.Content {...other}>{children}</Tooltip.Content>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
};

const meta = {
    title: 'Components/Tooltip',
    component: TooltipExample,
    tags: ['autodocs'],
    args: {
        className: '',
        delayDuration: 300,
        skipDelayDuration: 300,
        disableHoverableContent: false,
        children: 'This is tooltip content',
        side: 'top',
        sideOffset: 0,
        align: 'center',
        alignOffset: 0,
    },
    argTypes: {
        children: {
            name: 'text',
        },
        delayDuration: {
            description: 'The duration from when the mouse enters a tooltip trigger until the tooltip opens.',
        },
        skipDelayDuration: {
            description: 'How much time a user has to enter another trigger without incurring a delay again.',
        },
        disableHoverableContent: {
            description:
                'Prevents Tooltip.Content from remaining open when hovering. Disabling this has accessibility consequences.',
        },
        side: {
            description:
                'The preferred side of the trigger to render against when open. Will be reversed when collisions occur and avoidCollisions is enabled.',
            options: ['top', 'right', 'bottom', 'left'],
            control: { type: 'radio' },
        },
        sideOffset: {
            description: 'The distance in pixels from the trigger.',
        },
        align: {
            description: 'The preferred alignment against the trigger. May change when collisions occur.',
            options: ['start', 'center', 'end'],
            control: { type: 'radio' },
        },
        alignOffset: {
            description: 'An offset in pixels from the "start" or "end" alignment options.',
        },
    },
} satisfies Meta<typeof TooltipExample>;

export default meta;
type Story = StoryObj<typeof TooltipExample>;
export const WithIcon: Story = {
    args: {
        children: (
            <div className="flex items-center">
                <Copy className="mr-2" width={16} height={16} />
                Click to copy
            </div>
        ),
    },
};
