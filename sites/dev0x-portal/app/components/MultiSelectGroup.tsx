import { twMerge } from 'tailwind-merge';
import type { FieldSetProps } from './FieldSet';
import { FieldSet } from './FieldSet';

type MultiSelectGroupProps = {
    children: React.ReactNode;
    /** The label of the select group */
    label?: string;
    /** The name to be transmitted on form submission */
    name?: string;
    /** The classnames to be attached to the wrapper of the MultiSelectCards */
    wrapperClassName?: string;
} & FieldSetProps;

export function MultiSelectGroup({ children, label, name, wrapperClassName, ...props }: MultiSelectGroupProps) {
    return (
        <FieldSet label={label} name={name} {...props}>
            <div className={twMerge('grid grid-cols-[repeat(2,_minmax(0,_300px))] gap-3', wrapperClassName)}>
                {children}
            </div>
        </FieldSet>
    );
}
