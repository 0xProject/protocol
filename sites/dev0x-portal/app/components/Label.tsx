import * as RadixLabel from '@radix-ui/react-label';
import { twMerge } from 'tailwind-merge';

type LabelProps = Omit<RadixLabel.LabelProps, 'children'> & {
    label: string;
};

export function Label(props: LabelProps) {
    const { label, className } = props;

    return (
        <RadixLabel.Root className={twMerge('text-sm font-medium leading-4 text-grey-800 mb-2', className)} {...props}>
            {label}
        </RadixLabel.Root>
    );
}
