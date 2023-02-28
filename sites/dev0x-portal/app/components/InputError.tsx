import type { HTMLProps } from 'react';
import { twMerge } from 'tailwind-merge';

type InputErrorProps = HTMLProps<HTMLSpanElement>;

export function InputError({ className, children }: InputErrorProps) {
    return <span className={twMerge('text-red text-sm mt-2', className)}>{children}</span>;
}
