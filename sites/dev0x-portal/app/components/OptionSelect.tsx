import { ChevronUpIcon } from '@radix-ui/react-icons';
import { twMerge } from 'tailwind-merge';
import { tv } from 'tailwind-variants';
import { ChevronDown } from '../icons/ChevronDown';
import { InputError } from './InputError';
import { Label } from './Label';
import * as Select from './Select';

const input = tv({
    base: 'data-[placeholder]:text-grey-400 text-lg leading-[1.625rem] font-normal py-4 px-4 bg-grey-100 rounded-2xl border-2 border-transparent outline-black w-full inline-flex justify-between',
    variants: {
        error: {
            true: 'border-red outline-red',
            false: 'border-transparent hover:border-grey-300 border',
        },
    },
});

export type Option = {
    label: string;
    value: string;
};

type OptionSelectProps<T extends Option[]> = {
    /** The placeholder to display  */
    placeholder?: string;
    /** The options to select from */
    options: T;
    /** Optional default value to set */
    defaultValue?: T[number]['value'];
    /** Callback when the value changes */
    onChange?: (value: T[number]['value']) => void;
    className?: string;
    /** Error message */
    error?: string;
    /** Label to be displayed */
    label?: string;
    /** If set, will hide the label component and instead set the label as an aria-label on the trigger component */
    hiddenLabel?: boolean;
    /** The name of the field to be submitted in the parent form */
    name?: string;
    id?: string;
};

export default function OptionSelect<T extends Option[]>({
    placeholder,
    options,
    defaultValue,
    className,
    error,
    label,
    hiddenLabel,
    name,
    id,
    onChange,
}: OptionSelectProps<T>) {
    const isError = Boolean(error);

    const errorLabel = isError && id ? `${id}-error` : undefined;
    return (
        <div className="flex flex-col">
            {!hiddenLabel && label && <Label htmlFor={id} label={label} />}
            <Select.Root name={name} onValueChange={onChange}>
                <Select.Trigger
                    className={twMerge('items-center', input({ error: isError }), className)}
                    id={id}
                    aria-label={hiddenLabel ? label : undefined}
                >
                    <Select.Value placeholder={placeholder} defaultValue={defaultValue} />
                    <Select.Icon>
                        <ChevronDown height={20} width={20} aria-hidden />
                    </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                    <Select.Content position="popper" sticky="always" className="overflow-hidden" sideOffset={5}>
                        <Select.ScrollUpButton>
                            <ChevronUpIcon height={20} width={20} aria-hidden />
                        </Select.ScrollUpButton>
                        <Select.ViewPort>
                            <Select.Group>
                                {options.map(({ value, label }) => (
                                    <Select.Item value={value} key={value}>
                                        {label}
                                    </Select.Item>
                                ))}
                            </Select.Group>
                        </Select.ViewPort>
                        <Select.ScrollDownButton>
                            <ChevronDown height={20} width={20} aria-hidden />
                        </Select.ScrollDownButton>
                    </Select.Content>
                </Select.Portal>
            </Select.Root>
            {error && <InputError id={errorLabel}>{error}</InputError>}
        </div>
    );
}
