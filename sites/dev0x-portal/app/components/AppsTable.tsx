import { Table, Tbody, Td, Th, Thead, Tr } from './Table';
import { twMerge } from 'tailwind-merge';

import type { ComponentPropsWithRef, ComponentPropsWithoutRef } from 'react';
import type { App } from '../types';

type AppColorBarProps = ComponentPropsWithoutRef<'div'>;
function AppColorBar({ className, ...other }: AppColorBarProps) {
    return <div className={twMerge('mr-3 w-1 rounded', className)} {...other} />;
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
                    <Th>Volume</Th>
                    <Th>Users</Th>
                    <Th>Requests</Th>
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
                        <Td>{metrics.volume}</Td>
                        <Td>{metrics.users}</Td>
                        <Td>{metrics.requests}</Td>
                    </Tr>
                ))}
            </Tbody>
        </Table>
    );
}
