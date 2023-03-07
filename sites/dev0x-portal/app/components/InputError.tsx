import type { HTMLProps } from 'react';
import { twMerge } from 'tailwind-merge';

type InputErrorProps = HTMLProps<HTMLSpanElement>;

export function InputError({ className, children }: InputErrorProps) {
    return <span className={twMerge('text-red mt-2 text-sm', className)}>{children}</span>;
}
