import React, { useLayoutEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { InputContainer } from './InputContainer';
import { InputControl } from './InputControl';
import { InputStartDecorator, InputEndDecorator } from './InputDecorator';
import { InputError } from './InputError';
import { InputGroup } from './InputGroup';
import { Label } from './Label';

type InputProps = {
    label?: string;
    hiddenLabel?: boolean;
    className?: string;
    inputClassName?: string;
    error?: string;
    initialValue?: string;
    name: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    startDecorator?: React.ReactNode;
    endDecorator?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;

const makeObserverFunction = (ref: React.RefObject<HTMLDivElement>, varPrefix: string) => {
    return (entries: ResizeObserverEntry[]) => {
        const {
            contentRect: { width },
        } = entries[0];
        if (ref.current) {
            ref.current.style.setProperty(`--${varPrefix}-width`, width + 'px');
        }
    };
};

export function TextInput({
    label,
    className,
    hiddenLabel,
    error,
    initialValue,
    inputClassName,
    id,
    startDecorator,
    endDecorator,
    ...inputProps
}: InputProps) {
    const isError = Boolean(error);

    const errorLabel = isError && id ? `${id}-error` : undefined;

    const inputControlRef = useRef<HTMLInputElement>(null);
    const startDecoratorRef = useRef<HTMLDivElement>(null);
    const endDecoratorRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const startResizeObserver = new ResizeObserver(makeObserverFunction(inputControlRef, 'start-decorator'));
        const endResizeObserver = new ResizeObserver(makeObserverFunction(inputControlRef, 'end-decorator'));
        if (startDecoratorRef.current) {
            startResizeObserver.observe(startDecoratorRef.current);
        }
        if (endDecoratorRef.current) {
            endResizeObserver.observe(endDecoratorRef.current);
        }
        return () => {
            startResizeObserver.disconnect();
            endResizeObserver.disconnect();
        };
    }, [inputControlRef, startDecoratorRef, endDecoratorRef]);

    const input = (
        <InputControl
            id={id}
            defaultValue={initialValue}
            aria-invalid={error !== undefined}
            aria-errormessage={errorLabel}
            aria-label={hiddenLabel ? label : undefined}
            className={twMerge(
                // we want a 0.8rem padding on both sides of the decorator. (0.8rem + 0.8rem = 1.6rem)
                // in case a decorator doesn't exist, we only need 0.8rem padding, so we default the variable to -0.8rem
                'pl-[calc(var(--start-decorator-width,-0.8rem)+1.6rem)] pr-[calc(var(--end-decorator-width,-0.8rem)+1.6rem)]',
                inputClassName,
            )}
            ref={inputControlRef}
            {...inputProps}
        />
    );

    return (
        <InputContainer className={className}>
            {!hiddenLabel && label && <Label htmlFor={id} label={label} />}
            {startDecorator || endDecorator ? (
                <InputGroup>
                    {startDecorator && (
                        <InputStartDecorator ref={startDecoratorRef}>{startDecorator}</InputStartDecorator>
                    )}
                    {input}
                    {endDecorator && <InputEndDecorator ref={endDecoratorRef}>{endDecorator}</InputEndDecorator>}
                </InputGroup>
            ) : (
                input
            )}
            {error && <InputError id={errorLabel}>{error}</InputError>}
        </InputContainer>
    );
}
