import { useNavigate } from '@remix-run/react';
import type { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';
import { ArrowLeft } from '../icons/ArrowLeft';
import { IconButton } from './IconButton';

type BackButtonProps = {
    className?: string;
} & ComponentProps<typeof IconButton>;

export default function BackButton({ className, ...props }: BackButtonProps) {
    const navigator = useNavigate();

    return (
        <IconButton
            className={twMerge('bg-grey-100 hover:bg-grey-200 mb-6 rounded-[14px] p-[10px]', className)}
            onClick={() => navigator(-1)}
            color="grey"
            title="Go Back"
            {...props}
        >
            <ArrowLeft height={24} width={24} />
        </IconButton>
    );
}
