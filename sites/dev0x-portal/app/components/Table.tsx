import { forwardRef } from 'react';

import type { ComponentPropsWithoutRef } from 'react';
import { twMerge } from 'tailwind-merge';

export const Th = forwardRef<HTMLTableCellElement, ComponentPropsWithoutRef<'th'>>(function Th(
    { className, ...other },
    forwardedRef,
) {
    return (
        <th
            {...other}
            className={twMerge('text-grey-500 pb- px-5 pb-2 text-left font-sans text-sm font-normal', className)}
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
            className={twMerge('text-grey-800 p-5 font-sans text-base font-normal', className)}
            ref={forwardedRef}
        />
    );
});
export const Tr = forwardRef<HTMLTableRowElement, ComponentPropsWithoutRef<'tr'>>(function Td(props, forwardRef) {
    return <tr {...props} ref={forwardRef} />;
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
    return (
        <tbody
            {...other}
            className={twMerge('shadow-tbody divide-grey-200 divide-y rounded-xl', className)}
            ref={forwardedRef}
        />
    );
});

export const Table = forwardRef<HTMLTableElement, ComponentPropsWithoutRef<'table'>>(function Table(
    { className, ...other },
    forwardedRef,
) {
    return <table {...other} className={twMerge('w-full', className)} ref={forwardedRef} />;
});
