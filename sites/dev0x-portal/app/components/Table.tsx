import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

import type { ComponentPropsWithoutRef } from 'react';

export const Th = forwardRef<HTMLTableCellElement, ComponentPropsWithoutRef<'th'>>(function Th(
    { className, ...other },
    forwardedRef,
) {
    return (
        <th
            {...other}
            className={twMerge('text-grey-500 px-5 pb-4 text-left font-sans text-sm font-normal', className)}
            ref={forwardedRef}
        />
    );
});
export const Td = forwardRef<HTMLTableCellElement, ComponentPropsWithoutRef<'td'>>(function Td(
    { className, ...other },
    forwardedRef,
) {
    return (
        <td
            {...other}
            className={twMerge('text-grey-800 p-6 font-sans text-base font-normal', className)} //[1.5625rem]
            ref={forwardedRef}
        />
    );
});
export const Tr = forwardRef<HTMLTableRowElement, ComponentPropsWithoutRef<'tr'>>(function Td(
    { className, ...other },
    forwardRef,
) {
    return <tr className={twMerge(className)} {...other} ref={forwardRef} />;
});
export const Thead = forwardRef<HTMLTableSectionElement, ComponentPropsWithoutRef<'thead'>>(function Thead(
    props,
    forwardedRef,
) {
    return <thead {...props} ref={forwardedRef} />;
});

export const Tbody = forwardRef<HTMLTableSectionElement, ComponentPropsWithoutRef<'tbody'>>(function Tbody(
    { className, ...other },
    forwardedRef,
) {
    return <tbody {...other} className={twMerge(' divide-grey-200 divide-y ', className)} ref={forwardedRef} />;
});

export const Table = forwardRef<HTMLTableElement, ComponentPropsWithoutRef<'table'>>(function Table(
    { className, ...other },
    forwardedRef,
) {
    return <table {...other} className={twMerge('relative z-10 table w-full', className)} ref={forwardedRef} />;
});

export const Root = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function Root(
    { className, ...other },
    forwardedRef,
) {
    return (
        <div
            className={twMerge(
                "after:border-grey-100 relative z-0 after:absolute after:top-[39px] after:left-0 after:bottom-0 after:right-0 after:rounded-xl after:border after:border-solid after:shadow-sm after:content-['']",
                className,
            )}
            {...other}
            ref={forwardedRef}
        />
    );
});
