import type { HTMLProps } from 'react';
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { tv } from 'tailwind-variants';

const input = tv({
    base: 'placeholder-grey-400 text-lg leading-[1.625rem] font-normal py-4 px-4 bg-grey-100 rounded-2xl border-2 border-transparent outline-black w-full',
    variants: {
        error: {
            true: 'border-red outline-red',
        },
    },
});

export const InputControl = React.forwardRef<HTMLInputElement, HTMLProps<HTMLInputElement>>(function InputControl(
    { className, 'aria-invalid': ariaInvalid, ...rest }: HTMLProps<HTMLInputElement>,
    forwardRef,
) {
    const error = ariaInvalid === 'false' ? false : Boolean(ariaInvalid);

    return (
        <input
            className={twMerge(
                input({
                    error,
                }),
                className,
            )}
            ref={forwardRef}
            aria-invalid={ariaInvalid}
            {...rest}
        />
    );
});
