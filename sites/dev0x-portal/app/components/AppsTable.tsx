import { twMerge } from 'tailwind-merge';
import { Link } from '@remix-run/react';
import { Table, Tbody, Td, Th, Thead, Tr } from './Table';
import { ArrowNarrowRight } from '../icons/ArrowNarrowRight';

import type { LinkProps } from '@remix-run/react';
import type { ComponentPropsWithoutRef, ComponentPropsWithRef } from 'react';
import type { App } from '../types';

type AppColorBarProps = ComponentPropsWithoutRef<'div'>;
function AppColorBar({ className, ...other }: AppColorBarProps) {
    return <div className={twMerge('mr-3 w-1 rounded', className)} {...other} />;
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

type AppsTableProps = ComponentPropsWithRef<typeof Table> & {
    data: App[];
};
//Once we have more advance scenarios use @tanstack/react-table here
export function AppsTable({ data, ...other }: AppsTableProps) {
    return (
        <Table {...other}>
            <Thead>
                <Tr>
                    <Th className="text-grey-900 pl-0 text-left text-base">Projects</Th>
                    <Th>On-chain tag</Th>
                    <Th>Requests</Th>
                    <Th />
                </Tr>
            </Thead>
            <Tbody>
                {data.map(({ metrics, encodedUrlPathname, name, brandColor }) => (
                    <Tr key={encodedUrlPathname}>
                        <Td className="flex">
                            <AppColorBar
                                style={{
                                    backgroundColor: brandColor,
                                }}
                            />
                            <span className="font-medium">{name}</span>
                        </Td>
                        <Td>-</Td>
                        <Td>{metrics.requests}</Td>
                        <Td className="text-right">
                            <ExploreLink to={`/apps/${encodedUrlPathname}`} />
                        </Td>
                    </Tr>
                ))}
            </Tbody>
        </Table>
    );
}
