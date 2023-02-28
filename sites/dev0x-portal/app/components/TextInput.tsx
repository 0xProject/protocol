import React from 'react';
import { InputContainer } from './InputContainer';
import { InputControl } from './InputControl';
import { InputError } from './InputError';
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
} & React.InputHTMLAttributes<HTMLInputElement>;

export function TextInput({
    label,
    className,
    hiddenLabel,
    error,
    initialValue,
    inputClassName,
    id,
    ...inputProps
}: InputProps) {
    const isError = Boolean(error);

    const errorLabel = isError && id ? `${id}-error` : undefined;

    return (
        <InputContainer>
            {!hiddenLabel && label && <Label htmlFor={id} label={label} />}
            <InputControl
                id={id}
                defaultValue={initialValue}
                aria-invalid={error !== undefined}
                aria-errormessage={errorLabel}
                aria-label={hiddenLabel ? label : undefined}
                {...inputProps}
            />
            {error && <InputError id={errorLabel}>{error}</InputError>}
        </InputContainer>
    );
}
