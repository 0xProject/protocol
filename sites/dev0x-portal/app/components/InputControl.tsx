import type { HTMLProps } from 'react';
import { twMerge } from 'tailwind-merge';
import { tv } from 'tailwind-variants';

const input = tv({
    base: 'placeholder-grey-400 text-lg leading-[1.625rem] font-normal py-4 px-4 bg-grey-100 rounded-2xl border-2 border-transparent outline-black',
    variants: {
        error: {
            true: 'border-red outline-red',
        },
    },
});

export function InputControl({ className, 'aria-invalid': ariaInvalid, ...rest }: HTMLProps<HTMLInputElement>) {
    const error = ariaInvalid === 'false' ? false : Boolean(ariaInvalid);
    return <input className={twMerge(input({ error }), className)} aria-invalid={ariaInvalid} {...rest} />;
}
