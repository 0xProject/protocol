import type { HTMLProps } from 'react';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

type InputDecoratorProps = {
    /** Whether the decorator should be placed on the left or the right */
    placement: 'start' | 'end';
} & HTMLProps<HTMLDivElement>;

const InputDecorator = forwardRef<HTMLDivElement, InputDecoratorProps>(function InputDecorator(
    { placement, className, children, style, ...rest },
    ref,
) {
    return (
        <div
            data-input-decorator={placement}
            ref={ref}
            style={style}
            className={twMerge(
                'absolute top-0 bottom-0 my-auto max-h-fit',
                placement === 'start' ? 'left-4' : 'right-4',
                className,
            )}
            {...rest}
        >
            {children}
        </div>
    );
});

export type InputStartDecoratorProps = Omit<InputDecoratorProps, 'placement'>;
export type InputEndDecoratorProps = Omit<InputDecoratorProps, 'placement'>;

export const InputStartDecorator = forwardRef<HTMLDivElement, InputStartDecoratorProps>(function InputStartDecorator(
    props,
    ref,
) {
    return <InputDecorator {...props} ref={ref} placement="start" />;
});

export const InputEndDecorator = forwardRef<HTMLDivElement, InputEndDecoratorProps>(function InputEndDecorator(
    props,
    ref,
) {
    return <InputDecorator {...props} ref={ref} placement="end" />;
});
