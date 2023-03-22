import type { ComponentPropsWithoutRef } from 'react';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export type FieldSetProps = {
    children: React.ReactNode;
    label?: string;
    className?: string;
} & ComponentPropsWithoutRef<'fieldset'>;

export const FieldSet = forwardRef<HTMLFieldSetElement, FieldSetProps>(function FieldSet(
    { children, label, className, ...props },
    forwardedRef,
) {
    return (
        <fieldset ref={forwardedRef} {...props} role="group" className={twMerge('w-full', className)}>
            {label && <legend className="text-grey-800 mb-3 text-base antialiased">{label}</legend>}
            {children}
        </fieldset>
    );
});
