import { twMerge } from 'tailwind-merge';
import { Link, useNavigate } from '@remix-run/react';
import * as Table from './Table';
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
function Tr({ pathname, ...other }: ComponentPropsWithoutRef<typeof Table.Tr> & { pathname: string }) {
    const navigate = useNavigate();

    return (
        <Table.Tr
            role="button"
            {...other}
            onClick={(event) => {
                if (event.metaKey || event.ctrlKey) {
                    //open in new tab
                    window.open(`/apps/${pathname}`, '_blank');
                } else {
                    navigate(`/apps/${pathname}`);
                }
            }}
        />
    );
}

type AppsTableProps = ComponentPropsWithRef<typeof Table.Table> & {
    data: App[];
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
                    {data.map(({ encodedUrlPathname, name, brandColor }) => (
                        <Tr key={encodedUrlPathname} pathname={encodedUrlPathname}>
                            <Table.Td>
                                <div className="flex">
                                    <AppColorBar
                                        style={{
                                            backgroundColor: brandColor,
                                        }}
                                    />
                                    <span className="font-medium">{name}</span>
                                </div>
                            </Table.Td>
                            <Table.Td>-</Table.Td>
                            <Table.Td className=" text-right">
                                <ExploreLink to={`/apps/${encodedUrlPathname}`} />
                            </Table.Td>
                        </Tr>
                    ))}
                </Table.Tbody>
            </Table.Table>
        </Table.Root>
    );
}
