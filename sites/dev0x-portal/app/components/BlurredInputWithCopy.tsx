import { useState } from 'react';
import { tv } from 'tailwind-variants';
import { Copy2 } from '../icons/Copy2';
import { Eye2 } from '../icons/Eye2';
import { EyeOff2 } from '../icons/EyeOff2';
import { IconButton } from './IconButton';
import { TextInput } from './TextInput';

type BlurredInputWithCopyProps = {
    value: string;
    label: string;
    name?: string;
    hiddenLabel?: boolean;
    className?: string;
    initialShow?: boolean;
};

const blurredInputWithCopy = tv({
    variants: {
        show: {
            false: 'text-blurred pointer-events-none',
        },
    },
});

export function BlurredInputWithCopy({
    value,
    label,
    hiddenLabel,
    className,
    initialShow = false,
    name = '',
}: BlurredInputWithCopyProps) {
    const [show, setShow] = useState(initialShow);

    return (
        <TextInput
            name={name}
            value={value}
            label={label}
            hiddenLabel={hiddenLabel}
            className={className}
            inputClassName={blurredInputWithCopy({ show })}
            readOnly
            endDecorator={
                <div>
                    <IconButton
                        onClick={() => setShow(!show)}
                        color="white"
                        className="mr-3 h-11 w-11 shadow-md"
                        size="xs"
                        roundness="sm"
                        type="button"
                        aria-label={show ? 'Hide text' : 'Show text'}
                    >
                        {show ? <EyeOff2 /> : <Eye2 />}
                    </IconButton>
                    <IconButton
                        color="white"
                        className="h-11 w-11 shadow-md"
                        size="xs"
                        roundness="sm"
                        type="button"
                        aria-label="Copy to clipboard"
                        onClick={() => {
                            navigator.clipboard.writeText(value);
                        }}
                    >
                        <Copy2 />
                    </IconButton>
                </div>
            }
        />
    );
}
