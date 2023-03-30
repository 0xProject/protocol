import { twMerge } from 'tailwind-merge';
import { Link, useNavigate } from '@remix-run/react';
import { tv } from 'tailwind-variants';
import * as Table from './Table';
import { ArrowNarrowRight } from '../icons/ArrowNarrowRight';

import type { LinkProps } from '@remix-run/react';
import type { ComponentPropsWithoutRef, ComponentPropsWithRef } from 'react';
import type { ClientApp } from '../types';
import type { VariantProps } from 'tailwind-variants';

const appBar = tv({
    variants: {
        color: {
            1: 'bg-grey-300',
            2: 'bg-green',
            3: 'bg-blue-brand',
            4: 'bg-brown',
            5: 'bg-purple',
            6: 'bg-red',
            7: 'bg-green-dark',
            8: 'bg-blue-dark',
            9: 'bg-brown-dark',
            10: 'bg-purple-dark',
            11: 'bg-red-dark',
            12: 'bg-green-light',
            13: 'bg-blue-light',
            14: 'bg-brown-light',
            15: 'bg-purple-light',
            16: 'bg-red-light',
        },
    },
});
type AppColorBarProps = ComponentPropsWithoutRef<'div'> & VariantProps<typeof appBar>;

function AppColorBar({ className, color, ...other }: AppColorBarProps) {
    return <div className={twMerge(appBar({ color }), 'mr-3 w-1 rounded', className)} {...other} />;
}

function ExploreLink({ className, ...other }: LinkProps) {
    return (
        <Link
            className={twMerge('inline-flex items-center focus:outline-none focus-visible:right-1', className)}
            {...other}
        >
            Explore <ArrowNarrowRight className="ml-3" />
        </Link>
    );
}
function Tr({ pathname, ...other }: ComponentPropsWithoutRef<typeof Table.Tr> & { pathname: string }) {
    const navigate = useNavigate();

    return (
        <Table.Tr
            role="button"
            {...other}
            onClick={(event) => {
                if (event.metaKey || event.ctrlKey) {
                    //open in new tab
                    window.open(`/app/${pathname}`, '_blank');
                } else {
                    navigate(`/app/${pathname}`);
                }
            }}
        />
    );
}

type AppsTableProps = ComponentPropsWithRef<typeof Table.Table> & {
    data: ClientApp[];
};
//Once we have more advance scenarios use @tanstack/react-table here
export function AppsTable({ data, ...other }: AppsTableProps) {
    return (
        <Table.Root>
            <Table.Table {...other}>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th className="text-grey-900 pl-0 text-left text-base font-medium">Apps</Table.Th>
                        <Table.Th>On-chain tag</Table.Th>
                        <Table.Th />
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {data.map(({ id, name, brandColor, onChainTag }, index) => (
                        <Tr key={id} pathname={id}>
                            <Table.Td>
                                <div className="flex">
                                    {/* I don't know why TS complains here */}
                                    {/* @ts-ignore-next-line */}
                                    <AppColorBar color={(index % 16) + 1} />
                                    <span className="font-medium">{name}</span>
                                </div>
                            </Table.Td>
                            <Table.Td>{onChainTag?.name ? onChainTag.name : '-'}</Table.Td>
                            <Table.Td className=" text-right">
                                <ExploreLink to={`/app/${id}`} />
                            </Table.Td>
                        </Tr>
                    ))}
                </Table.Tbody>
            </Table.Table>
        </Table.Root>
    );
}
