import { Button } from '../app/components/Button';
import * as DropdownMenu from '../app/components/DropdownMenu';
import { ChevronDown } from '../app/icons/ChevronDown';

import type { Meta } from '@storybook/react';

type SimpleDropdownProps = {
    items: { name: string }[];
};

export function SimpleDropdown({ items }: SimpleDropdownProps) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <Button color="grey" roundness="lg" size="sm" endIcon={<ChevronDown aria-hidden />}>
                    Open
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content sideOffset={5}>
                    {items.map(({ name }, index) => {
                        return (
                            <DropdownMenu.Item asChild key={index}>
                                <div className="font-sans text-base">{name}</div>
                            </DropdownMenu.Item>
                        );
                    })}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}

const meta = {
    title: 'Components/Dropdown',
    component: SimpleDropdown,
    tags: ['autodocs'],
    args: {
        items: [{ name: 'Option 1' }, { name: 'Option 2' }],
    },
} satisfies Meta<typeof SimpleDropdown>;

export default meta;
